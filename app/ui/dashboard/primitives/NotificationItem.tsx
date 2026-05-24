'use client';

import clsx from 'clsx';
import {
  BookmarkIcon,
  ClockIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ArrowRightOnRectangleIcon,
  EnvelopeIcon,
  EnvelopeOpenIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import type { NotificationType } from '@/app/lib/supabase/notifications';
import type { ComponentType, SVGProps, ReactNode } from 'react';

type IconSpec = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  text: string;
  bg: string;
};

const TYPE_STYLES: Record<NotificationType, IconSpec> = {
  hold_ready:     { icon: BookmarkIcon,              text: 'text-primary dark:text-dark-primary', bg: 'bg-primary/10 dark:bg-dark-primary/15' },
  hold_placed:    { icon: BookmarkIcon,              text: 'text-accent-teal',                    bg: 'bg-accent-teal/10' },
  due_soon:       { icon: ClockIcon,                 text: 'text-warning',                        bg: 'bg-warning/10' },
  checkout:       { icon: ArrowRightOnRectangleIcon, text: 'text-accent-amber',                   bg: 'bg-accent-amber/12' },
  checkin:        { icon: CheckCircleIcon,           text: 'text-success',                        bg: 'bg-success/10' },
  loan_confirmed: { icon: CheckCircleIcon,           text: 'text-success',                        bg: 'bg-success/10' },
};

const FALLBACK: IconSpec = {
  icon: InformationCircleIcon,
  text: 'text-muted dark:text-on-dark-soft',
  bg: 'bg-surface-cream-strong dark:bg-dark-surface-strong',
};

type NotificationItemProps = {
  type: NotificationType | string;
  title: string;
  body: string;
  timeLabel: string;
  read: boolean;
  flagged?: boolean;
  onClick?: () => void;
  onToggleFlag?: () => void;
  onToggleRead?: () => void;
  expanded?: boolean;
  details?: ReactNode;
};

export default function NotificationItem({
  type,
  title,
  body,
  timeLabel,
  read,
  flagged = false,
  onClick,
  onToggleFlag,
  onToggleRead,
  expanded = false,
  details,
}: NotificationItemProps) {
  const style = TYPE_STYLES[type as NotificationType] ?? FALLBACK;
  const Icon = style.icon;

  return (
    <div
      className={clsx(
        'group relative',
        !read && 'bg-primary/[0.04] dark:bg-dark-primary/[0.06]',
      )}
    >
      <div className="flex items-center transition-colors hover:bg-surface-soft dark:hover:bg-dark-surface-soft">
        {/* Main tap target: icon + two-line content */}
        <button
          type="button"
          onClick={onClick}
          className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
        >
          {/* Type icon — vertically centered */}
          <span
            className={clsx(
              'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full',
              style.bg,
              style.text,
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>

          {/* Two-line content block */}
          <div className="min-w-0 flex-1">
            {/* Row 1: title (flex-1 truncate) + time (inline, right-aligned) */}
            <div className="flex items-baseline gap-2">
              <p
                className={clsx(
                  'min-w-0 flex-1 truncate font-sans text-[14px] leading-snug text-ink dark:text-on-dark',
                  !read ? 'font-semibold' : 'font-normal',
                )}
              >
                {title}
              </p>
              <span className="flex-shrink-0 font-mono text-[11px] tabular-nums text-muted-soft dark:text-on-dark-soft">
                {timeLabel}
              </span>
            </div>
            {/* Row 2: body preview — single line, truncated */}
            <p className="mt-0.5 truncate font-sans text-[13px] leading-snug text-muted dark:text-on-dark-soft">
              {body}
            </p>
          </div>
        </button>

        {/* Action buttons — outside the main button */}
        <div className="flex flex-shrink-0 items-center pr-2">
          {/* Flag star — always visible (faint when unflagged) */}
          {onToggleFlag && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleFlag(); }}
              title={flagged ? 'Remove flag' : 'Flag'}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-surface-cream-strong dark:hover:bg-dark-surface-strong"
            >
              {flagged
                ? <StarSolid className="h-4 w-4 text-warning" />
                : <StarIcon className="h-4 w-4 text-muted-soft/50 dark:text-on-dark-soft/40" />
              }
            </button>
          )}
          {/* Mark read/unread — hidden on mobile, hover-only on desktop */}
          {onToggleRead && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleRead(); }}
              title={read ? 'Mark as unread' : 'Mark as read'}
              className="hidden h-8 w-8 items-center justify-center rounded-lg opacity-0 transition hover:bg-surface-cream-strong group-hover:opacity-100 dark:hover:bg-dark-surface-strong sm:flex"
            >
              {read
                ? <EnvelopeIcon className="h-4 w-4 text-muted-soft dark:text-on-dark-soft" />
                : <EnvelopeOpenIcon className="h-4 w-4 text-primary dark:text-dark-primary" />
              }
            </button>
          )}
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && details && (
        <div className="border-t border-hairline bg-surface-soft px-5 py-4 dark:border-dark-hairline dark:bg-dark-surface-soft">
          {details}
        </div>
      )}
    </div>
  );
}
