import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SupportTab } from '../../src/components/settings/SupportTab';
import userEvent from '@testing-library/user-event';

describe('SupportTab', () => {
  const mockProps = {
    onDonationClick: vi.fn(),
  };

  it('renders the support tab', () => {
    render(<SupportTab {...mockProps} />);
    expect(screen.getByTestId('support-tab')).toBeInTheDocument();
  });

  it('displays donate button', () => {
    render(<SupportTab {...mockProps} />);
    expect(screen.getByTestId('donate-button')).toBeInTheDocument();
  });

  it('displays star on github link', () => {
    render(<SupportTab {...mockProps} />);
    expect(screen.getByTestId('star-github-link')).toBeInTheDocument();
  });

  it('displays contribute on github link', () => {
    render(<SupportTab {...mockProps} />);
    expect(screen.getByTestId('contribute-github-link')).toBeInTheDocument();
  });

  it('calls onDonationClick when donate button clicked', async () => {
    const user = userEvent.setup();
    render(<SupportTab {...mockProps} />);
    
    await user.click(screen.getByTestId('donate-button'));
    
    expect(mockProps.onDonationClick).toHaveBeenCalled();
  });

  it('displays community section', () => {
    render(<SupportTab {...mockProps} />);
    expect(screen.getByText(/Join the Community/)).toBeInTheDocument();
  });

  it('displays thank you message', () => {
    render(<SupportTab {...mockProps} />);
    expect(screen.getByText(/Thank you/)).toBeInTheDocument();
  });
});
