'use server';

import { revalidatePath } from 'next/cache';
import { getDashboardSession } from '@/app/lib/auth/session';
import { getSupabaseServerClient } from '@/app/lib/supabase/server';

export type ProfileNameFormState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

export type ProfileAvatarFormState = {
  status: 'idle' | 'success' | 'error';
  message: string;
};

export type ProfileUpdateFormState = {
  status: 'idle' | 'submitting' | 'success' | 'error';
  message?: string;
};

export async function updateProfileNamesAction(
  _prevState: ProfileNameFormState,
  formData: FormData,
): Promise<ProfileNameFormState> {
  try {
    const session = await getDashboardSession();
    const user = session.user;

    if (!user) {
      return { status: 'error', message: 'You must be signed in to update your profile.' };
    }

    const displayNameInput = formData.get('display_name');
    const usernameInput = formData.get('username');

    const displayName =
      typeof displayNameInput === 'string' ? displayNameInput.trim() : '';
    const username =
      typeof usernameInput === 'string' ? usernameInput.trim() : '';

    if (displayName.length > 120) {
      return {
        status: 'error',
        message: 'Display name is too long. Please keep it under 120 characters.',
      };
    }

    if (username.length > 60) {
      return {
        status: 'error',
        message: 'Username is too long. Please keep it under 60 characters.',
      };
    }

    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from('UserProfile')
      .upsert(
        {
          user_id: user.id,
          display_name: displayName.length > 0 ? displayName : null,
          username: username.length > 0 ? username : null,
        },
        { onConflict: 'user_id' },
      );

    if (error) {
      if (error.code === '23505') {
        return {
          status: 'error',
          message: 'That username is already taken. Please choose another one.',
        };
      }

      console.error('Failed to update profile names', error);
      return {
        status: 'error',
        message: 'Unable to update your profile right now. Please try again later.',
      };
    }

    revalidatePath('/profile');
    revalidatePath('/dashboard/profile');

    return {
      status: 'success',
      message: 'Profile details updated.',
    };
  } catch (error) {
    console.error('Unexpected error updating profile names', error);
    return {
      status: 'error',
      message: 'An unexpected error occurred.',
    };
  }
}

export async function updateProfileAvatar(
  prevState: ProfileAvatarFormState,
  formData: FormData,
): Promise<ProfileAvatarFormState> {
  try {
    const session = await getDashboardSession();
    if (!session.user) {
      return { status: 'error', message: 'You must be logged in to update your profile.' };
    }

    const avatarFile = formData.get('avatar') as File;
    if (!avatarFile) {
      return { status: 'error', message: 'No file selected.' };
    }

    // Check file size (max 2MB)
    if (avatarFile.size > 2 * 1024 * 1024) {
      return { status: 'error', message: 'File size must be less than 2MB.' };
    }

    // Check file type
    if (!avatarFile.type.startsWith('image/')) {
      return { status: 'error', message: 'File must be an image.' };
    }

    const supabase = getSupabaseServerClient();

    // Upload file to Supabase Storage
    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, avatarFile, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      const msg = uploadError.message.includes('Bucket not found')
        ? 'Storage bucket not configured. Contact the administrator.'
        : 'Failed to upload image. Please try again.';
      return { status: 'error', message: msg };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    // Update user profile with new avatar URL
    const { error: updateError } = await supabase
      .from('UserProfile')
      .upsert({
        user_id: session.user.id,
        avatar_url: publicUrl
      }, { onConflict: 'user_id' });

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return { status: 'error', message: 'Error updating profile.' };
    }

    revalidatePath('/profile');
    revalidatePath('/dashboard/profile');
    return { status: 'success', message: 'Profile picture updated successfully.' };

  } catch (error) {
    console.error('Error in updateProfileAvatar:', error);
    return { status: 'error', message: 'An unexpected error occurred.' };
  }
}

export async function updateProfileAction(
  prevState: ProfileUpdateFormState,
  formData: FormData,
): Promise<ProfileUpdateFormState> {
  try {
    const session = await getDashboardSession();
    if (!session.user) {
      return {
        status: 'error',
        message: 'You must be logged in to update your profile.',
      };
    }

    const phoneNumber = formData.get('phone')?.toString().trim();

    const updateData = {
      display_name: formData.get('display_name')?.toString().trim() || null,
      username: formData.get('username')?.toString().trim() || null,
      phone: phoneNumber || null,
      preferred_language: formData.get('preferred_language')?.toString().trim() || null,
      faculty: formData.get('faculty')?.toString().trim() || null,
      department: formData.get('department')?.toString().trim() || null,
      bio: formData.get('bio')?.toString().trim() || null,
    };

    // Validate fields
    if (updateData.username && updateData.username.length > 60) {
      return {
        status: 'error',
        message: 'Username is too long. Please keep it under 60 characters.',
      };
    }

    if (updateData.bio && updateData.bio.length > 500) {
      return {
        status: 'error',
        message: 'Bio is too long. Please keep it under 500 characters.',
      };
    }

    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from('UserProfile')
      .upsert(
        {
          user_id: session.user.id,
          ...updateData,
        },
        { onConflict: 'user_id' },
      );

    if (error) {
      if (error.code === '23505') {
        return {
          status: 'error',
          message: 'That username is already taken. Please choose another one.',
        };
      }

      console.error('Failed to update profile:', error);
      return {
        status: 'error',
        message: 'Unable to update your profile right now. Please try again later.',
      };
    }

    revalidatePath('/profile');
    revalidatePath('/dashboard/profile');

    return {
      status: 'success',
      message: 'Profile updated successfully.',
    };
  } catch (error) {
    console.error('Failed to update profile:', error);
    return {
      status: 'error',
      message: 'An unexpected error occurred. Please try again.',
    };
  }
}
