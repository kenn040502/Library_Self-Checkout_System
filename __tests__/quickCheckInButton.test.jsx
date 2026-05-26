import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import QuickCheckInButton from '@/app/ui/dashboard/quickCheckInButton';

jest.mock('@/app/dashboard/actions', () => ({
  checkinBookAction: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/app/dashboard/actionState', () => ({
  initialActionState: { status: 'idle', message: '' },
}));

describe('QuickCheckInButton', () => {
  it('renders the confirmation dialog outside the table cell container', () => {
    render(
      <div data-testid="loan-table-shell">
        <QuickCheckInButton
          loanId="loan-1"
          bookTitle="Interaction Design"
          borrowerName="Doro"
        />
      </div>,
    );

    fireEvent.click(screen.getByRole('button', { name: /^return$/i }));

    const dialog = screen.getByRole('dialog', { name: /confirm book return/i });
    expect(dialog.parentElement).toBe(document.body);
    expect(
      within(screen.getByTestId('loan-table-shell')).queryByRole('dialog'),
    ).not.toBeInTheDocument();
  });
});
