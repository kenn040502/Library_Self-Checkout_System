import { ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from '@heroicons/react/24/outline';

type PaginationProps = {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
};

const buttonBaseClass =
	'inline-flex h-10 items-center justify-center rounded-btn border border-hairline bg-surface-card px-4 font-sans text-button text-ink transition hover:bg-surface-cream-strong disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark dark:hover:bg-dark-surface-strong dark:focus-visible:ring-offset-dark-canvas';

export function Pagination({
	currentPage,
	totalPages,
	onPageChange,
}: PaginationProps) {
  return (
    <div className="mx-auto flex w-fit items-center gap-4">
      {/* Previous */}
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className={buttonBaseClass}
        aria-label="Previous page"
        suppressHydrationWarning
      >
        <ChevronDoubleLeftIcon className="h-5 w-5" />
      </button>

      {/* Page indicator */}
      <span className="font-sans text-body-sm text-ink dark:text-on-dark">
        Page {currentPage} of {totalPages}
      </span>

      {/* Next */}
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className={buttonBaseClass}
        aria-label="Next page"
        suppressHydrationWarning
      >
        <ChevronDoubleRightIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
