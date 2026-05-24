'use client';

import { useEffect, useState, useTransition, type FormEvent } from 'react';
import { addUserAction } from '@/app/actions/addUser';
import RoleSelect from '@/app/ui/dashboard/primitives/RoleSelect';
import { roleOptions, type ManagedRole } from '@/app/ui/dashboard/admin/userProfileFields';

type Props = {
  open: boolean;
  onClose: () => void;
  // addUserAction returns only `{ success, error }` (see app/actions/addUser.ts);
  // it does NOT return the inserted user. So the consumer should call router.refresh()
  // when this fires to re-fetch the list from the server, rather than trying to
  // optimistically prepend a partial row without an id.
  onAdded: () => void;
};

const initialState = { email: '', fullName: '', role: 'user' as ManagedRole };

export default function AddUserDialog({ open, onClose, onAdded }: Props) {
  const [form, setForm] = useState(initialState);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Reset state every time the dialog opens.
  useEffect(() => {
    if (open) {
      setForm(initialState);
      setConfirming(false);
      setError(null);
    }
  }, [open]);

  // Lock background scroll while open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const trimmedEmail = form.email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Email is required.');
      return;
    }
    if (
      (form.role === 'staff' || form.role === 'admin') &&
      !trimmedEmail.endsWith('@swinburne.edu.my')
    ) {
      setError('Staff and admin must use their Swinburne Outlook email addresses.');
      return;
    }
    setConfirming(true);
  };

  const handleConfirm = () => {
    startTransition(async () => {
      const trimmedName = form.fullName.trim();
      const result = await addUserAction({
        email: form.email.trim().toLowerCase(),
        display_name: trimmedName || undefined,
        role: form.role,
      });
      if (!result.success) {
        setError(result.error ?? 'Failed to add user.');
        setConfirming(false);
        return;
      }
      onAdded();
      onClose();
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-user-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={() => { if (!pending) onClose(); }}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm dark:bg-dark-canvas/60"
      />

      {/* Panel — relative so it sits above the backdrop */}
      <div className="relative w-full max-w-md overflow-hidden rounded-card border border-hairline bg-surface-card shadow-lg dark:border-dark-hairline dark:bg-dark-surface-card">
        <header className="flex items-center justify-between border-b border-hairline-soft px-6 py-4 dark:border-dark-hairline">
          <h2 id="add-user-dialog-title" className="font-display text-display-sm text-ink dark:text-on-dark">
            {confirming ? 'Confirm new user' : 'Add user'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="font-sans text-caption text-muted hover:text-ink dark:text-on-dark-soft dark:hover:text-on-dark"
          >
            Close
          </button>
        </header>

        <div className="px-6 py-5">
          {error && (
            <p className="mb-4 rounded-btn border border-primary/30 bg-primary/10 px-3 py-2 font-sans text-body-sm text-primary dark:text-dark-primary">
              {error}
            </p>
          )}

          {!confirming ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-1 block font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">Email</span>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="person@swinburne.edu.my"
                  className="h-10 w-full rounded-btn border border-hairline bg-canvas px-3.5 font-sans text-body-md text-ink placeholder:text-muted-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">Full name</span>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Full name"
                  className="h-10 w-full rounded-btn border border-hairline bg-canvas px-3.5 font-sans text-body-md text-ink placeholder:text-muted-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">Role</span>
                <RoleSelect
                  value={form.role}
                  onChange={(role) => setForm((prev) => ({ ...prev, role }))}
                  options={roleOptions}
                />
              </label>
              <p className="font-sans text-caption text-muted dark:text-on-dark-soft">
                Staff and admin must use their Swinburne Outlook email addresses.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-btn border border-hairline bg-canvas px-4 py-2 font-sans text-button text-ink transition hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark dark:focus-visible:ring-offset-dark-canvas"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-btn bg-primary px-4 py-2 font-sans text-button text-on-primary transition hover:bg-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:bg-dark-primary dark:focus-visible:ring-offset-dark-canvas"
                >
                  Continue
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="font-sans text-body-md text-ink dark:text-on-dark">
                You are about to create an account for{' '}
                <span className="font-semibold">{form.email.trim().toLowerCase()}</span>{' '}
                with the role <span className="font-semibold">{form.role}</span>. Proceed?
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirming(false)}
                  className="rounded-btn border border-hairline bg-canvas px-4 py-2 font-sans text-button text-ink transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark dark:focus-visible:ring-offset-dark-canvas"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={handleConfirm}
                  className="rounded-btn bg-primary px-4 py-2 font-sans text-button text-on-primary transition hover:bg-primary-active disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:bg-dark-primary dark:focus-visible:ring-offset-dark-canvas"
                >
                  {pending ? 'Creating…' : 'Create user'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

