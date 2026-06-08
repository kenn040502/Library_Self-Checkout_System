import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import HomePage from '@/app/page'

jest.mock('next/cache', () => ({
  unstable_noStore: jest.fn(),
}));

jest.mock('next/image', () => ({
	__esModule: true,
  default: ({ src, alt }) => <img src={src} alt={alt} />,
}))

jest.mock('framer-motion', () => ({
  ...jest.requireActual('framer-motion'),
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }) => <p {...props}>{children}</p>,
    span: ({ children, ...props }) => <span {...props}>{children}</span>,
    section: ({ children, ...props }) => <section {...props}>{children}</section>,
    footer: ({ children, ...props }) => <footer {...props}>{children}</footer>,
    header: ({ children, ...props }) => <header {...props}>{children}</header>,
  },
  useInView: () => true,
  AnimatePresence: ({ children }) => children,
}));

describe('Home Page', () => {
  it('Render Heading 1', () => {
    render(<HomePage/>);

    const heading = screen.getByRole('heading', { name: /swinburne library self-checkout/i })

    expect(heading).toBeInTheDocument();
  })

  it('Render local Swinburne logo', () => {
    render(<HomePage/>)

    const logo = screen.getByAltText(/Swinburne Logo/i)

    expect(logo).toHaveAttribute('src', '/swinburne-logo.png')
  })

  it('Render All Button', () => {
    render(<HomePage/>)

    // In the Home Page, the login button and the get start button have using the button, but the learn more just use the link, not button
    const LoginButton = screen.getByRole('button', { name: /log in/i })
    const GetStartedButton = screen.getByRole('button', { name: /get started/i })
    const LearnMoreButton = screen.getByRole('link', { name: /learn more/i })

    expect(LoginButton).toBeInTheDocument();
    expect(GetStartedButton).toBeInTheDocument();
    expect(LearnMoreButton).toBeInTheDocument();
  })
})
