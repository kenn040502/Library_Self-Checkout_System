'use client';

import { useState, useTransition } from 'react';
import ConfirmModal from '@/app/ui/dashboard/confirmModal';

type Variant = 'subtle' | 'warning';

type Props = {
  holdId: string;
  bookTitle: string;
  patronName?: string;
  cancelAction: (formData: FormData) => Promise<void>;
  variant?: Variant;
  label?: string;
};

const STYLES: Record<Variant, string> = {
  subtle:
    'inline-flex h-9 items-center rounded-btn border border-hairline bg-surface-card px-3 font-sans text-caption-uppercase text-ink transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark dark:hover:bg-dark-surface-strong dark:focus-visible:ring-offset-dark-canvas',
  warning:
    'rounded-btn border border-primary/30 bg-primary/5 px-3 py-1.5 font-sans text-button text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-primary/30 dark:bg-dark-primary/10 dark:text-dark-primary dark:hover:bg-dark-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas',
};

export default function StaffCancelHoldButton({
  holdId,
  bookTitle,
  patronName,
  cancelAction,
  variant = 'subtle',
  label,
}: Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleConfirm = () => {
    setShowConfirm(false);
    const fd = new FormData();
    fd.set('holdId', holdId);
    startTransition(async () => {
      await cancelAction(fd);
    });
  };

  const buttonText = label ?? (variant === 'warning' ? 'Cancel hold' : 'Cancel');

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={pending}
        className={STYLES[variant]}
      >
        {pending ? 'Cancelling…' : buttonText}
      </button>

      <ConfirmModal
        isOpen={showConfirm}
        type="danger"
        title="Cancel this reservation?"
        message={`Cancel the hold on "${bookTitle}"${
          patronName ? ` for ${patronName}` : ''
        }? The patron will receive a notification. This cannot be undone.`}
        confirmText="Yes, cancel hold"
        cancelText="Keep reservation"
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
