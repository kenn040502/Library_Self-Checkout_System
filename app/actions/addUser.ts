'use server';

import { getSupabaseServerClient } from '@/app/lib/supabase/server';
import { getDashboardSession } from '@/app/lib/auth/session';

const normalizeRole = (value: string): 'user' | 'staff' | 'admin' => {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'admin') return 'admin';
  if (normalized === 'staff' || normalized === 'librarian') return 'staff';
  return 'user';
};

type AddUserPayload = {
  email: string;
  display_name?: string;
  role: string;
};

export async function addUserAction(formData: AddUserPayload) {
  try {
    const { user: callerUser } = await getDashboardSession();
    if (!callerUser || callerUser.role !== 'admin') {
      return { success: false, error: 'Admins only.' };
    }

    const email = formData.email?.trim().toLowerCase();
    if (!email) {
      return { success: false, error: 'Email is required.' };
    }

    const role = normalizeRole(formData.role ?? 'user');
    const supabase = getSupabaseServerClient();

    const { data: existingUser, error: lookupError } = await supabase
      .from('Users')
      .select('id, role')
      .eq('email', email)
      .maybeSingle<{ id: string; role: string }>();

    if (lookupError) {
      console.error('Failed to lookup user before insert', lookupError);
      return { success: false, error: 'Unable to verify existing users.' };
    }

    let userId: string;

    if (existingUser) {
      const { error: updateError } = await supabase
        .from('Users')
        .update({ role })
        .eq('id', existingUser.id);

      if (updateError) {
        console.error('Failed to update existing user role', updateError);
        return { success: false, error: 'Unable to update user role.' };
      }

      userId = existingUser.id;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('Users')
        .insert({ email, role })
        .select('id')
        .single<{ id: string }>();

      if (insertError || !inserted) {
        console.error('Failed to create user', insertError);
        return {
          success: false,
          error: insertError?.message ?? 'Unable to create user.',
        };
      }

      userId = inserted.id;
    }

    if (formData.display_name) {
      const profilePayload = {
        user_id: userId,
        display_name: formData.display_name,
      };

      const { error: profileError } = await supabase
        .from('UserProfile')
        .upsert(profilePayload, { onConflict: 'user_id' });

      if (profileError) {
        console.warn('User created but profile upsert failed', profileError);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error while adding user', err);
    return { success: false, error: err.message ?? 'Unexpected server error' };
  }
}
