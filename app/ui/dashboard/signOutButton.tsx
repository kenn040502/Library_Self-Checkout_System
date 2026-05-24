'use client';

import { useTransition } from 'react';
import clsx from 'clsx';
import { signOut } from 'next-auth/react';
import { PowerIcon } from '@heroicons/react/24/outline';

const DEFAULT_CLASS_NAME =
  'inline-flex items-center justify-center gap-2 rounded-btn border border-hairline bg-surface-card px-4 h-10 font-sans text-button text-ink hover:bg-surface-cream-strong dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark dark:hover:bg-dark-surface-strong';

export default function SignOutButton({
  className,
  labelClassName,
}: {
  className?: string;
  labelClassName?: string;
}) {
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      // Clear the NextAuth session cookie
      await signOut({ redirect: false });
      // Then end the Azure AD SSO session so the next sign-in shows the account picker
      window.location.href = '/api/auth/azure-signout';
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      suppressHydrationWarning
      className={clsx(
        className ?? DEFAULT_CLASS_NAME,
        'transition disabled:cursor-not-allowed',
        pending && 'opacity-75'
      )}
    >
      <PowerIcon className="w-5" />
      <span className={labelClassName}>
        {pending ? 'Signing out...' : 'Sign Out'}
      </span>
    </button>
  );
}
