import clsx from 'clsx';

type ManagedRole = 'admin' | 'staff' | 'user';

type RoleSelectProps = {
  value: ManagedRole;
  onChange: (next: ManagedRole) => void;
  options: ReadonlyArray<ManagedRole>;
  className?: string;
};

const TONE: Record<ManagedRole, string> = {
  admin:
    'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 dark:bg-dark-primary/20 dark:text-dark-primary dark:border-dark-primary/30',
  staff:
    'bg-accent-amber/15 text-accent-amber border-accent-amber/30 hover:bg-accent-amber/20',
  user:
    'bg-surface-card text-muted border-hairline hover:bg-surface-cream-strong dark:bg-dark-surface-card dark:text-on-dark-soft dark:border-dark-hairline dark:hover:bg-dark-surface-strong',
};

const LABEL: Record<ManagedRole, string> = {
  admin: 'ADMIN',
  staff: 'STAFF',
  user: 'STUDENT',
};

export default function RoleSelect({ value, onChange, options, className }: RoleSelectProps) {
  return (
    <div className={clsx('relative inline-flex p-2', className)}>
      {/* Wrapper carries the tinted pill look so the native <select> can stay
          transparent. If the select itself had a tinted background, Chrome's
          dropdown panel would inherit those colors and render the options
          unreadably (e.g. red-on-red). */}
      <div
        className={clsx(
          'relative inline-flex items-center rounded-pill border min-w-[120px]',
          'transition',
          TONE[value],
        )}
      >
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as ManagedRole)}
          aria-label="Change role"
          className={clsx(
            'cursor-pointer appearance-none bg-transparent',
            'pl-4 pr-10 py-2 min-w-[120px]',
            'font-sans text-caption-uppercase font-semibold',
            'focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas',
            'text-inherit',
          )}
        >
          {options.map((role) => (
            <option
              key={role}
              value={role}
              style={{ backgroundColor: '#ffffff', color: '#111827' }}
            >
              {LABEL[role]}
            </option>
          ))}
        </select>
        {/* Chevron */}
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="pointer-events-none absolute right-3 h-4 w-4 opacity-70"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 011.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  );
}
