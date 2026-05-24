import type { ReactNode } from 'react';

type DashboardTitleBarProps = {
  subtitle: string;
  title: string;
  description: string;
  rightSlot?: ReactNode;
};

export default function DashboardTitleBar({
  subtitle,
  title,
  description,
  rightSlot,
}: DashboardTitleBarProps) {
  return (
    <header className="mb-8 flex items-end justify-between gap-6 border-b border-hairline pb-6 dark:border-dark-hairline">
      <div>
        <p className="mb-1.5 font-sans text-caption-uppercase text-muted dark:text-muted-soft">
          {subtitle}
        </p>
        <h1 className="font-display text-display-lg tracking-tight text-ink dark:text-on-dark">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl font-sans text-body-md text-body dark:text-on-dark-soft">
            {description}
          </p>
        )}
      </div>
      <div className="flex flex-shrink-0 items-center gap-3">
        {rightSlot}
      </div>
    </header>
  );
}
