import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SideNav from '@/app/ui/dashboard/sidenav';

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

jest.mock('@/app/ui/theme/themeProvider', () => ({
  useTheme: () => ({
    theme: 'light',
    toggleTheme: jest.fn(),
  }),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, priority: _priority, ...props }) => <img alt={alt} {...props} />,
}));

const user = {
  id: 'user-1',
  name: 'Kelvin',
  email: 'kelvin@example.com',
  role: 'user',
};

test('renders the Swinburne logo in the expanded desktop sidebar', () => {
  render(<SideNav user={user} isBypassed={false} />);

  const logo = screen.getByRole('img', { name: /swinburne/i });
  expect(logo).toHaveAttribute('src', '/swinburne-logo.png');
  expect(logo.closest('a')).toHaveAttribute('href', '/dashboard');
});
