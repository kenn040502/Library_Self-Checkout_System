'use server';

import { getSupabaseServerClient } from '@/app/lib/supabase/server';
import { getDashboardSession } from '@/app/lib/auth/session';

export async function deleteUserAction(id: string) {
  try {
    const { user: callerUser } = await getDashboardSession();
    if (!callerUser || callerUser.role !== 'admin') {
      return { success: false, error: 'Admins only.' };
    }

    if (!id) {
      return { success: false, error: 'User ID is required.' };
    }

    const supabase = getSupabaseServerClient();

    const { error: profileError } = await supabase.from('UserProfile').delete().eq('user_id', id);
    if (profileError) {
      console.error('Failed to remove user profile', profileError);
      return { success: false, error: profileError.message };
    }

    const { error } = await supabase.from('Users').delete().eq('id', id);

    if (error) {
      console.error('Failed to delete user', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Unexpected server error while deleting user', err);
    return { success: false, error: err.message ?? 'Unknown error' };
  }
}
