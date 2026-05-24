'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import clsx from 'clsx';
import { updateProfileAction, type ProfileUpdateFormState } from '@/app/profile/actions';
import { CheckIcon } from '@heroicons/react/24/outline';
import { Button } from '@/app/ui/button';

type ProfileEditFormProps = {
  username: string | null;
  phone: string | null;
  preferredLanguage: string | null;
  faculty: string | null;
  department: string | null;
  bio: string | null;
};

const inputClass =
  'block w-full rounded-btn border border-hairline bg-canvas px-3.5 h-10 font-sans text-body-md text-ink placeholder:text-muted-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:bg-surface-soft disabled:cursor-not-allowed dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark dark:placeholder:text-on-dark-soft dark:focus-visible:ring-offset-dark-canvas';

const textareaClass = clsx(inputClass, 'h-auto py-2.5 resize-none');

const labelClass = 'block mb-1.5 font-sans text-caption-uppercase text-muted dark:text-on-dark-soft';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" aria-disabled={pending} disabled={pending} suppressHydrationWarning>
      {pending ? (
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Saving...
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <CheckIcon className="h-4 w-4" />
          Save Changes
        </span>
      )}
    </Button>
  );
}

export default function ProfileEditForm({
  username,
  phone,
  preferredLanguage,
  faculty,
  department,
  bio,
}: ProfileEditFormProps) {
  const [state, formAction] = useActionState(updateProfileAction, {
    status: 'idle',
    message: undefined,
  } satisfies ProfileUpdateFormState);

  return (
    <form action={formAction} className="space-y-4 sm:space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-5">
        {/* Username */}
        <div>
          <label htmlFor="username" className={labelClass}>
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            defaultValue={username ?? ''}
            placeholder="Choose a username"
            className={inputClass}
            maxLength={50}
            suppressHydrationWarning
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className={labelClass}>
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={phone ?? ''}
            placeholder="Your phone number"
            className={inputClass}
            maxLength={20}
            pattern="[0-9\s+-]+"
            suppressHydrationWarning
          />
          <p className="mt-1.5 font-sans text-caption text-muted-soft dark:text-on-dark-soft">
            Format: 012 3456 7890
          </p>
        </div>

        {/* Preferred Language */}
        <div>
          <label htmlFor="preferred_language" className={labelClass}>
            Preferred Language
          </label>
          <input
            id="preferred_language"
            name="preferred_language"
            type="text"
            defaultValue={preferredLanguage ?? ''}
            placeholder="Your preferred language"
            className={inputClass}
            maxLength={50}
            suppressHydrationWarning
          />
        </div>

        {/* Faculty */}
        <div>
          <label htmlFor="faculty" className={labelClass}>
            Faculty
          </label>
          <input
            id="faculty"
            name="faculty"
            type="text"
            defaultValue={faculty ?? ''}
            placeholder="Your faculty"
            className={inputClass}
            maxLength={100}
            suppressHydrationWarning
          />
        </div>

        {/* Department */}
        <div className="sm:col-span-2">
          <label htmlFor="department" className={labelClass}>
            Department
          </label>
          <input
            id="department"
            name="department"
            type="text"
            defaultValue={department ?? ''}
            placeholder="Your department"
            className={inputClass}
            maxLength={100}
            suppressHydrationWarning
          />
        </div>
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className={labelClass}>
          About
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={4}
          defaultValue={bio ?? ''}
          placeholder="Write a short bio about yourself..."
          className={textareaClass}
          maxLength={500}
        />
      </div>

      {/* Submit and Status */}
      <div className="flex flex-col items-center justify-between gap-3 border-t border-hairline pt-3 sm:flex-row-reverse dark:border-dark-hairline">
        <SubmitButton />
        {state.status !== 'idle' && (
          <p
            className={clsx(
              'font-sans text-body-sm font-medium',
              state.status === 'success' ? 'text-success' : 'text-error',
            )}
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
