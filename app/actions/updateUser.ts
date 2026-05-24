'use server';

import { getSupabaseServerClient } from '@/app/lib/supabase/server';
import { getDashboardSession } from '@/app/lib/auth/session';

const normalizeRole = (value: string | undefined): 'user' | 'staff' | 'admin' | undefined => {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'admin') return 'admin';
  if (normalized === 'staff' || normalized === 'librarian') return 'staff';
  return 'user';
};

type UpdateUserInput = {
  id: string;
  user?: Record<string, unknown> | null;
  profile?: Record<string, unknown> | null;
};

export async function updateUserAction(updateData: UpdateUserInput) {
  try {
    const { user: callerUser } = await getDashboardSession();
    if (!callerUser || callerUser.role !== 'admin') {
      return { success: false, error: 'Admins only.' };
    }

    if (!updateData.id) {
      return { success: false, error: 'User ID is required.' };
    }

    const supabase = getSupabaseServerClient();

    const userUpdates = updateData.user ?? {};
    const profileUpdates = updateData.profile ?? {};

    const userPayload: Record<string, unknown> = {};

    if ('email' in userUpdates) {
      const rawEmail = userUpdates.email;
      if (typeof rawEmail === 'string') {
        const normalizedEmail = rawEmail.trim().toLowerCase();
        if (!normalizedEmail) {
          return { success: false, error: 'Email cannot be empty.' };
        }
        userPayload.email = normalizedEmail;
      } else if (rawEmail === null) {
        return { success: false, error: 'Email cannot be null.' };
      }
    }

    if ('role' in userUpdates) {
      const normalizedRole = normalizeRole(
        typeof userUpdates.role === 'string' ? userUpdates.role : undefined,
      );
      if (normalizedRole) {
        userPayload.role = normalizedRole;
      }
    }

    if ('display_name' in userUpdates) {
      const displayNameValue = userUpdates.display_name;
      if (typeof displayNameValue === 'string') {
        const trimmed = displayNameValue.trim();
        userPayload.display_name = trimmed.length > 0 ? trimmed : null;
      } else if (displayNameValue === null) {
        userPayload.display_name = null;
      }
    }

    Object.entries(userUpdates).forEach(([key, value]) => {
      if (['email', 'role', 'display_name', 'id'].includes(key)) {
        return;
      }
      if (value === undefined) {
        return;
      }
      userPayload[key] = value;
    });

    if (Object.keys(userPayload).length > 0) {
      const { error: updateError } = await supabase
        .from('Users')
        .update(userPayload)
        .eq('id', updateData.id);

      if (updateError) {
        console.error('Failed to update user record', updateError);
        return { success: false, error: updateError.message };
      }
    }

    const profilePayload: Record<string, unknown> = {};
    Object.entries(profileUpdates).forEach(([key, value]) => {
      if (key === 'user_id') return;
      if (value === undefined) return;
      profilePayload[key] = value;
    });

    if (Object.keys(profilePayload).length > 0) {
      const { error: profileError } = await supabase
        .from('UserProfile')
        .upsert(
          {
            user_id: updateData.id,
            ...profilePayload,
          },
          { onConflict: 'user_id' },
        );

      if (profileError) {
        console.error('Failed to update user profile', profileError);
        return { success: false, error: profileError.message };
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Unexpected server error while updating user', err);
    return { success: false, error: err.message ?? 'Unknown server error' };
  }
}
