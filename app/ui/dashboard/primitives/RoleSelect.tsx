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
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as ManagedRole)}
      aria-label="Change role"
      className={clsx(
        'cursor-pointer appearance-none rounded-pill border',
        'pl-4 pr-10 py-2 min-w-[120px]',
        'font-sans text-caption-uppercase font-semibold transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas',
        TONE[value],
      )}
    >
        {options.map((role) => (
          <option key={role} value={role} className="bg-canvas font-sans normal-case tracking-normal text-ink dark:bg-dark-surface dark:text-on-dark">
            {LABEL[role]}
          </option>
        ))}
      </select>
    </div>
  );
}
