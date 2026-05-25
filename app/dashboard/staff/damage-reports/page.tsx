import { redirect } from 'next/navigation';
import { getDashboardSession } from '@/app/lib/auth/session';
import {
  fetchDamageReports,
  getDamageReportSignedUrls,
} from '@/app/lib/supabase/queries';
import AdminShell from '@/app/ui/dashboard/adminShell';
import DamageReportsViewer from '@/app/ui/dashboard/staff/damageReportsViewer';

interface SearchParams {
  severity?: string;
  range?: string;
  q?: string;
}

const parseDaysBack = (range?: string): number | undefined => {
  if (range === '7') return 7;
  if (range === '30') return 30;
  if (range === '90') return 90;
  return undefined;
};

export default async function DamageReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await getDashboardSession();
  if (!user) redirect('/login');
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/dashboard');

  const params = await searchParams;
  const severityFilter = params.severity
    ? (params.severity.split(',').filter((s) =>
        ['damaged', 'lost', 'needs_inspection'].includes(s),
      ) as Array<'damaged' | 'lost' | 'needs_inspection'>)
    : undefined;

  const daysBack = parseDaysBack(params.range);

  const reports = await fetchDamageReports({
    severity: severityFilter,
    daysBack,
    search: params.q,
    limit: 200,
  });

  // Pre-resolve signed URLs for the detail panel; otherwise the modal would
  // need a server action round-trip per open. Volume is low so this is fine.
  const allPaths = Array.from(
    new Set(reports.flatMap((r) => r.photoPaths).filter((p) => p)),
  );
  const signed = await getDamageReportSignedUrls(allPaths);
  const signedMap: Record<string, string | null> = {};
  signed.forEach((entry) => {
    signedMap[entry.path] = entry.signedUrl;
  });

  return (
    <>
      <title>Damage reports | Swinburne Library</title>
      <AdminShell
        titleSubtitle="Circulation"
        title="Damage reports"
        description="All copy condition reports submitted during returns. Review notes, photos, and the linked loan to follow up if needed."
      >
        <DamageReportsViewer
          reports={reports}
          signedUrls={signedMap}
          userRole={user.role}
          initialFilters={{
            severity: severityFilter ?? [],
            range: params.range ?? 'all',
            q: params.q ?? '',
          }}
        />
      </AdminShell>
    </>
  );
}
