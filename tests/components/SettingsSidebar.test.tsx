import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SettingsSidebar } from '../../src/components/settings/SettingsSidebar';
import userEvent from '@testing-library/user-event';

describe('SettingsSidebar', () => {
  const mockProps = {
    selectedTab: 'general',
    onTabChange: vi.fn(),
  };

  it('renders the settings sidebar', () => {
    render(<SettingsSidebar {...mockProps} />);
    expect(screen.getByTestId('settings-sidebar')).toBeInTheDocument();
  });

  it('renders all tab buttons', () => {
    render(<SettingsSidebar {...mockProps} />);
    
    expect(screen.getByTestId('settings-tab-general')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-categories')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-tags')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-backup')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-integrity')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-support')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-config')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-experimental')).toBeInTheDocument();
  });

  it('highlights the selected tab', () => {
    render(<SettingsSidebar {...mockProps} />);
    
    const generalTab = screen.getByTestId('settings-tab-general');
    expect(generalTab).toHaveClass('bg-primary'); // default variant
  });

  it('calls onTabChange when a tab is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsSidebar {...mockProps} />);
    
    await user.click(screen.getByTestId('settings-tab-categories'));
    
    expect(mockProps.onTabChange).toHaveBeenCalledWith('categories');
  });

  it('updates selected tab when prop changes', () => {
    const { rerender } = render(<SettingsSidebar {...mockProps} />);
    
    expect(screen.getByTestId('settings-tab-general')).toHaveClass('bg-primary');
    
    rerender(<SettingsSidebar selectedTab="tags" onTabChange={mockProps.onTabChange} />);
    
    expect(screen.getByTestId('settings-tab-tags')).toHaveClass('bg-primary');
  });

  it('shows nav element with correct testid', () => {
    render(<SettingsSidebar {...mockProps} />);
    expect(screen.getByTestId('settings-nav')).toBeInTheDocument();
  });
});
