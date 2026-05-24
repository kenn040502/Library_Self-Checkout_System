'use client';

import { useRef, useState, useActionState } from 'react';
import { ArrowPathIcon, CameraIcon } from '@heroicons/react/24/outline';
import { updateProfileAvatar } from './actions';
import type { ProfileAvatarFormState } from './actions';

const getRandomDefaultAvatar = () => {
  // List of Dicebear styles we can use
  const styles = ['adventurer', 'avataaars', 'bottts', 'fun-emoji', 'lorelei'];
  const randomStyle = styles[Math.floor(Math.random() * styles.length)];
  const seed = Math.random().toString(36).substring(7);
  return `https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${seed}`;
};

const initialState: ProfileAvatarFormState = { status: 'idle', message: '' };

export default function ProfileAvatarForm({
  avatarUrl,
  displayName,
}: {
  avatarUrl: string | null;
  displayName: string | null;
}) {
  const [state, formAction] = useActionState(updateProfileAvatar, initialState);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const defaultAvatar = avatarUrl || getRandomDefaultAvatar();

  const handleFileChange = async (e: React.ChangeEvent<HTMLFormElement>) => {
    setIsUploading(true);
    try {
      const formData = new FormData(e.currentTarget);
      await formAction(formData);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="group relative flex-none">
      <div className="relative inline-block">
        <div className="relative h-16 w-16 transition-transform duration-300 group-hover:scale-105 sm:h-20 sm:w-20">
          <img
            src={defaultAvatar}
            alt={`${displayName ?? 'User'} avatar`}
            className="relative h-full w-full rounded-full object-cover ring-2 ring-hairline dark:ring-dark-hairline"
          />
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 text-on-primary ring-4 ring-canvas transition-colors hover:bg-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:bg-dark-primary dark:hover:bg-primary-active dark:ring-dark-canvas dark:focus-visible:ring-offset-dark-canvas"
          aria-label="Change avatar"
          suppressHydrationWarning
        >
          <CameraIcon className="h-4 w-4" />
        </button>
      </div>

      <form onChange={handleFileChange} className="mt-2 flex flex-col items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          name="avatar"
          accept="image/*"
          className="hidden"
          disabled={isUploading}
        />
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/50 backdrop-blur-sm">
            <ArrowPathIcon className="h-8 w-8 animate-spin text-on-dark" />
          </div>
        )}
        {state.status === 'error' && (
          <p className="mt-1 font-sans text-caption font-medium text-error">
            {state.message}
          </p>
        )}
      </form>
    </div>
  );
}
