import type { ReactNode } from 'react';

type AdminShellProps = {
  titleSubtitle: string;
  title: string;
  description?: string;
  primaryAction?: ReactNode;
  showHeader?: boolean;
  children: ReactNode;
};

export default function AdminShell({
  titleSubtitle,
  title,
  description,
  primaryAction,
  showHeader = true,
  children,
}: AdminShellProps) {
  return (
    <div className="flex flex-col">
      {/* Header */}
      {showHeader ? (
        <header className="mb-8 flex items-end justify-between gap-4 border-b border-hairline pb-6 dark:border-dark-hairline">
          <div className="min-w-0">
            <p className="mb-1.5 font-sans text-caption-uppercase text-muted dark:text-muted-soft">
              {titleSubtitle}
            </p>
            <h1 className="font-display text-display-lg tracking-tight text-ink dark:text-on-dark">
              {title}
            </h1>
            {description && (
              <p className="mt-2 hidden max-w-2xl font-sans text-body-md text-body dark:text-on-dark-soft sm:block">
                {description}
              </p>
            )}
          </div>
          <div className="flex flex-shrink-0 items-center gap-3">
            {primaryAction}
          </div>
        </header>
      ) : null}

      {/* Content */}
      {children}
    </div>
  );
}
