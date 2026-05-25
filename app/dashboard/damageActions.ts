'use server';

import { getDashboardSession } from '@/app/lib/auth/session';
import { getSupabaseServerClient } from '@/app/lib/supabase/server';
import { promoteNextHoldForBook } from '@/app/lib/supabase/queries';
import {
  createNotification,
  createUserNotification,
} from '@/app/lib/supabase/notifications';

export type DamagePhotoUploadResult =
  | { status: 'success'; urls: string[] }
  | { status: 'error'; message: string };

const MAX_PHOTOS = 3;
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function uploadDamagePhotos(formData: FormData): Promise<DamagePhotoUploadResult> {
  const { user } = await getDashboardSession();
  if (!user) return { status: 'error', message: 'You must be signed in.' };
  if (user.role !== 'staff' && user.role !== 'admin') {
    return { status: 'error', message: 'Only staff can report damage.' };
  }

  const loanId = formData.get('loanId');
  if (typeof loanId !== 'string' || loanId.length === 0) {
    return { status: 'error', message: 'Missing loan reference.' };
  }

  const rawFiles = formData.getAll('photos').filter((f): f is File => f instanceof File);
  if (rawFiles.length === 0) return { status: 'success', urls: [] };
  if (rawFiles.length > MAX_PHOTOS) {
    return { status: 'error', message: `Please attach at most ${MAX_PHOTOS} photos.` };
  }

  for (const file of rawFiles) {
    if (file.size > MAX_BYTES) {
      return { status: 'error', message: 'Each photo must be under 2 MB.' };
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return { status: 'error', message: 'Photos must be JPEG, PNG, or WEBP.' };
    }
  }

  const supabase = getSupabaseServerClient();
  const urls: string[] = [];
  const uploadedPaths: string[] = [];

  for (let i = 0; i < rawFiles.length; i++) {
    const file = rawFiles[i];
    if (!file) continue;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${loanId}/${Date.now()}-${i}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('damage-reports')
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (uploadError) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from('damage-reports').remove(uploadedPaths);
      }
      console.error('Damage photo upload failed', uploadError);
      return { status: 'error', message: 'Upload failed. Please try again.' };
    }
    uploadedPaths.push(path);
    urls.push(path);
  }

  return { status: 'success', urls };
}

export type DamageActionResult = { ok: true } | { ok: false; error: string };

// Shared type for the pre-action report lookup.
type ReportLookup = {
  id: string;
  severity: string;
  photo_urls: string[] | null;
  copy_id: string | null;
  copy: {
    book: { id: string | null; title: string | null } | null;
    barcode: string | null;
    status: string | null;
  } | null;
};

const REPORT_LOOKUP_SELECT =
  'id, severity, photo_urls, copy_id, copy:Copies(book:Books(id, title), barcode, status)';

/**
 * After a copy is restored to 'available', promote the next queued hold for
 * the book and notify the waiting patron.
 */
async function promoteHoldAndNotify(bookId: string, bookTitle: string): Promise<void> {
  try {
    const promotion = await promoteNextHoldForBook(bookId);
    if (promotion) {
      const expiryLabel = new Date(promotion.expiresAt).toLocaleDateString('en-MY', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      await createUserNotification(
        promotion.patronId,
        'hold_ready',
        'Your hold is ready for pickup',
        `"${bookTitle}" is now available. Collect it by ${expiryLabel}.`,
        { bookTitle, holdId: promotion.promotedHoldId, expiresAt: promotion.expiresAt },
      );
    }
  } catch (err) {
    console.warn('[damageActions] hold promotion failed', err);
  }
}

/**
 * Reset a copy to 'available' if it was locked by the damage flow.
 * Returns the book_id for use in hold promotion, or null if nothing was reset.
 */
async function resetCopyIfDamaged(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  report: ReportLookup,
): Promise<string | null> {
  const copyId = report.copy_id;
  const currentStatus = report.copy?.status;
  if (
    !copyId ||
    (currentStatus !== 'damaged' && currentStatus !== 'lost' && currentStatus !== 'processing')
  ) {
    return null;
  }

  const { error } = await supabase
    .from('Copies')
    .update({ status: 'available' })
    .eq('id', copyId);
  if (error) {
    console.error('[damageActions] copy status reset failed', error);
    return null;
  }

  return report.copy?.book?.id ?? null;
}

/**
 * Delete a damage report. Allowed for staff/admin.
 * Resets the copy to 'available', promotes any queued hold, removes photos,
 * and broadcasts a staff/admin notification.
 */
export async function deleteDamageReportAction(reportId: string): Promise<DamageActionResult> {
  const { user } = await getDashboardSession();
  if (!user) return { ok: false, error: 'You must be signed in.' };
  if (user.role !== 'staff' && user.role !== 'admin') {
    return { ok: false, error: 'Only staff or admin can delete damage reports.' };
  }
  if (!reportId) return { ok: false, error: 'Missing report id.' };

  const supabase = getSupabaseServerClient();

  const { data: report, error: lookupError } = await supabase
    .from('DamageReports')
    .select(REPORT_LOOKUP_SELECT)
    .eq('id', reportId)
    .maybeSingle<ReportLookup>();

  if (lookupError) {
    console.error('[deleteDamageReportAction] lookup failed', lookupError);
    return { ok: false, error: 'Could not load the damage report.' };
  }
  if (!report) return { ok: false, error: 'Report not found.' };

  const bookTitle = report.copy?.book?.title ?? report.copy?.barcode ?? 'Unknown book';

  const { error: deleteError } = await supabase
    .from('DamageReports')
    .delete()
    .eq('id', reportId);

  if (deleteError) {
    console.error('[deleteDamageReportAction] delete failed', deleteError);
    return { ok: false, error: deleteError.message ?? 'Could not delete the report.' };
  }

  const bookId = await resetCopyIfDamaged(supabase, report);
  if (bookId) {
    await promoteHoldAndNotify(bookId, bookTitle);
  }

  // Remove photos from storage (best-effort).
  const paths = (report.photo_urls ?? []).filter((p) => typeof p === 'string' && p.length > 0);
  if (paths.length > 0) {
    await supabase.storage.from('damage-reports').remove(paths).catch((err) => {
      console.warn('[deleteDamageReportAction] photo cleanup failed', err);
    });
  }

  try {
    const actorName = user.name ?? user.username ?? user.email ?? 'Library staff';
    await createNotification(
      'damage_report',
      'Damage report deleted',
      `${actorName} deleted the damage report for "${bookTitle}".`,
      { action: 'deleted', bookTitle, actorName, severity: report.severity, reportId },
    );
  } catch (err) {
    console.warn('[deleteDamageReportAction] notification failed', err);
  }

  return { ok: true };
}

/**
 * Mark a damage report as resolved (book repaired / back in circulation).
 * Allowed for staff/admin. Keeps the historical record intact; sets
 * resolved_at + resolved_by + optional resolution_notes, resets the copy
 * to 'available', and promotes any queued hold for that book.
 */
export async function resolveDamageReportAction(input: {
  reportId: string;
  resolutionNotes?: string | null;
}): Promise<DamageActionResult> {
  const { user } = await getDashboardSession();
  if (!user) return { ok: false, error: 'You must be signed in.' };
  if (user.role !== 'staff' && user.role !== 'admin') {
    return { ok: false, error: 'Only staff or admin can resolve damage reports.' };
  }
  if (!input.reportId) return { ok: false, error: 'Missing report id.' };

  const supabase = getSupabaseServerClient();

  const { data: report, error: lookupError } = await supabase
    .from('DamageReports')
    .select(REPORT_LOOKUP_SELECT)
    .eq('id', input.reportId)
    .is('resolved_at', null)
    .maybeSingle<ReportLookup>();

  if (lookupError) {
    console.error('[resolveDamageReportAction] lookup failed', lookupError);
    return { ok: false, error: 'Could not load the damage report.' };
  }
  if (!report) return { ok: false, error: 'Report not found or already resolved.' };

  const bookTitle = report.copy?.book?.title ?? report.copy?.barcode ?? 'Unknown book';
  const trimmedNotes = (input.resolutionNotes ?? '').trim();

  const { error: resolveError } = await supabase
    .from('DamageReports')
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
      resolution_notes: trimmedNotes.length > 0 ? trimmedNotes : null,
    })
    .eq('id', input.reportId);

  if (resolveError) {
    console.error('[resolveDamageReportAction] resolve failed', resolveError);
    return { ok: false, error: resolveError.message ?? 'Could not resolve the report.' };
  }

  const bookId = await resetCopyIfDamaged(supabase, report);
  if (bookId) {
    await promoteHoldAndNotify(bookId, bookTitle);
  }

  try {
    const actorName = user.name ?? user.username ?? user.email ?? 'Library staff';
    await createNotification(
      'damage_report',
      'Book repaired — back in circulation',
      `${actorName} marked "${bookTitle}" as repaired and returned it to circulation.`,
      {
        action: 'resolved',
        bookTitle,
        actorName,
        severity: report.severity,
        reportId: input.reportId,
      },
    );
  } catch (err) {
    console.warn('[resolveDamageReportAction] notification failed', err);
  }

  return { ok: true };
}

/**
 * Update a damage report's severity and/or notes. Admin only.
 */
export async function updateDamageReportAction(input: {
  reportId: string;
  severity?: 'damaged' | 'lost' | 'needs_inspection';
  notes?: string | null;
}): Promise<DamageActionResult> {
  const { user } = await getDashboardSession();
  if (!user) return { ok: false, error: 'You must be signed in.' };
  if (user.role !== 'admin') {
    return { ok: false, error: 'Only admin can edit damage reports.' };
  }
  if (!input.reportId) return { ok: false, error: 'Missing report id.' };

  const supabase = getSupabaseServerClient();

  const updates: Record<string, unknown> = {};
  if (input.severity) updates.severity = input.severity;
  if (input.notes !== undefined) {
    const trimmed = (input.notes ?? '').trim();
    updates.notes = trimmed.length > 0 ? trimmed : null;
  }
  if (Object.keys(updates).length === 0) {
    return { ok: false, error: 'No changes to save.' };
  }

  const { data: updated, error } = await supabase
    .from('DamageReports')
    .update(updates)
    .eq('id', input.reportId)
    .select('id, copy:Copies(book:Books(title), barcode)')
    .maybeSingle<{
      id: string;
      copy: { book: { title: string | null } | null; barcode: string | null } | null;
    }>();

  if (error) {
    console.error('[updateDamageReportAction] update failed', error);
    return { ok: false, error: error.message ?? 'Could not update the report.' };
  }
  if (!updated) return { ok: false, error: 'Report not found.' };

  const bookTitle = updated.copy?.book?.title ?? updated.copy?.barcode ?? 'Unknown book';

  try {
    const actorName = user.name ?? user.username ?? user.email ?? 'Admin';
    await createNotification(
      'damage_report',
      'Damage report updated',
      `${actorName} updated the damage report for "${bookTitle}".`,
      {
        action: 'updated',
        bookTitle,
        actorName,
        ...(input.severity ? { severity: input.severity } : {}),
        reportId: input.reportId,
      },
    );
  } catch (err) {
    console.warn('[updateDamageReportAction] notification failed', err);
  }

  return { ok: true };
}
