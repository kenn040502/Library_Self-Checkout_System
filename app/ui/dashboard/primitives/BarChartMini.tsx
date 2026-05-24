import clsx from 'clsx';

type BarChartMiniProps = {
  data: number[];
  height?: number;
  highlightLast?: boolean;
  className?: string;
};

export default function BarChartMini({
  data,
  height = 120,
  highlightLast = true,
  className,
}: BarChartMiniProps) {
  const max = data.length > 0 ? Math.max(...data) : 1;
  return (
    <div
      className={clsx('flex items-end gap-1', className)}
      style={{ height }}
      role="img"
      aria-label={`Bar chart, ${data.length} values, peak ${max}`}
    >
      {data.map((v, i) => {
        const isLast = i === data.length - 1;
        return (
          <div
            key={i}
            className={clsx(
              'flex-1 rounded-sm transition-all',
              isLast && highlightLast
                ? 'bg-primary dark:bg-dark-primary'
                : 'bg-primary/30 dark:bg-dark-primary/30',
            )}
            style={{
              height: `${(v / max) * 100}%`,
              opacity: isLast && highlightLast ? 1 : 0.35 + (i / Math.max(data.length, 1)) * 0.65,
            }}
          />
        );
      })}
    </div>
  );
}
