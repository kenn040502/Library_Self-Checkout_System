'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import clsx from 'clsx';
import { updateProfileNamesAction, type ProfileNameFormState } from '@/app/profile/actions';
import { PencilSquareIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Button } from '@/app/ui/button';

type ProfileNameFormProps = {
  displayName: string | null;
  username: string | null;
};

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
          Save
        </span>
      )}
    </Button>
  );
}

export default function ProfileNameForm({
  displayName,
  username,
}: ProfileNameFormProps) {
  const [state, formAction] = useActionState(updateProfileNamesAction, {
    status: 'idle',
    message: undefined,
  } satisfies ProfileNameFormState);

  return (
    <form action={formAction} className="flex w-full flex-col items-start gap-3 sm:flex-row sm:items-center">
      <div className="relative w-full flex-1">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <PencilSquareIcon className="h-4 w-4 text-muted-soft dark:text-on-dark-soft" aria-hidden="true" />
        </div>
        <input
          id="display_name"
          name="display_name"
          type="text"
          defaultValue={displayName ?? ''}
          placeholder="Display Name"
          className="block h-10 w-full rounded-btn border border-hairline bg-canvas pl-10 pr-3.5 font-sans text-body-md text-ink placeholder:text-muted-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark dark:placeholder:text-on-dark-soft dark:focus-visible:ring-offset-dark-canvas"
          maxLength={120}
          suppressHydrationWarning
        />
        {state.status !== 'idle' && (
          <p
            className={clsx(
              'absolute -top-5 left-0 font-sans text-caption font-medium',
              state.status === 'success' ? 'text-success' : 'text-error',
            )}
          >
            {state.message}
          </p>
        )}
      </div>
      <div className="w-full sm:w-auto">
        <SubmitButton />
      </div>
    </form>
  );
}
