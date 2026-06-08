import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MyBooksTabs from '@/app/ui/dashboard/student/myBooksTabs';

jest.mock('@/app/ui/dashboard/renewButton', () => ({
  __esModule: true,
  default: () => <button type="button">Renew</button>,
}));

const historyLoan = {
  id: 'loan-1',
  borrowedAt: '2026-05-01T00:00:00.000Z',
  dueAt: '2026-05-15T00:00:00.000Z',
  returnedAt: '2026-05-10T00:00:00.000Z',
  loanDurationDays: 9,
  renewedCount: 0,
  book: {
    id: 'book-1',
    title: 'A Very Long Book Title That Should Stay Inside The Mobile Viewport',
    author: 'A Long Author Name',
    isbn: '97812345678901234567890',
  },
};

test('contains mobile my-books layout so wide history content cannot stretch the page', () => {
  render(
    <MyBooksTabs
      activeLoans={[]}
      loanHistory={[historyLoan]}
      holds={[]}
      defaultTab="history"
    />,
  );

  expect(screen.getByRole('tablist', { name: /my books/i })).toHaveClass('overflow-x-auto');
  expect(screen.getByTestId('history-table-shell')).toHaveClass('hidden', 'md:block');
  expect(screen.getByTestId('history-mobile-list')).toHaveClass('md:hidden');
});
