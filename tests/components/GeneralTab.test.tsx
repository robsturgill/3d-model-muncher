import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GeneralTab } from '../../src/components/settings/GeneralTab';
import { AppConfig } from '../../src/types/config';
import userEvent from '@testing-library/user-event';

describe('GeneralTab', () => {
  const mockConfig: AppConfig = {
    categories: [],
    settings: {
      itemsPerPage: 12,
      defaultView: 'grid' as const,
      autoSave: true,
      modelsDirectory: './models',
      verboseScanLogs: false,
    },
    filters: {
      defaultCategory: 'all',
      defaultPrintStatus: 'all',
    },
    lastModified: new Date().toISOString(),
  };

  const mockProps = {
    config: mockConfig,
    onConfigFieldChange: vi.fn(),
    onSaveConfig: vi.fn().mockResolvedValue(undefined),
    onLoadServerConfig: vi.fn().mockResolvedValue(undefined),
  };

  it('renders the general tab', () => {
    render(<GeneralTab {...mockProps} />);
    expect(screen.getByTestId('general-tab')).toBeInTheDocument();
  });

  it('displays items per page input', () => {
    render(<GeneralTab {...mockProps} />);
    const input = screen.getByTestId('items-per-page-input') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('12');
  });

  it('calls onConfigFieldChange when items per page changes', async () => {
    const user = userEvent.setup();
    render(<GeneralTab {...mockProps} />);
    
    const input = screen.getByTestId('items-per-page-input') as HTMLInputElement;
    // Focus and type - with controlled inputs, this appends to existing value
    await user.click(input);
    await user.keyboard('5');  // This will make it "125"
    
    // Just verify that onConfigFieldChange was called with the settings field
    // The exact value isn't critical for the test - we're testing that the handler is wired up
    expect(mockProps.onConfigFieldChange).toHaveBeenCalledWith('settings.itemsPerPage', expect.any(Number));
  });

  it('displays default view select', () => {
    render(<GeneralTab {...mockProps} />);
    expect(screen.getByTestId('default-view-select')).toBeInTheDocument();
  });

  it('displays auto-save switch', () => {
    render(<GeneralTab {...mockProps} />);
    const switchElement = screen.getByTestId('auto-save-switch');
    expect(switchElement).toBeInTheDocument();
    expect(switchElement).toBeChecked();
  });

  it('shows model directory edit button', () => {
    render(<GeneralTab {...mockProps} />);
    expect(screen.getByTestId('edit-model-dir-button')).toBeInTheDocument();
  });

  it('allows editing model directory', async () => {
    const user = userEvent.setup();
    render(<GeneralTab {...mockProps} />);
    
    // Click edit button
    await user.click(screen.getByTestId('edit-model-dir-button'));
    
    // Input should appear
    const input = screen.getByTestId('model-dir-input');
    expect(input).toBeInTheDocument();
    
    // Type new path
    await user.clear(input);
    await user.type(input, 'C:\\\\models');
    
    // Save
    await user.click(screen.getByTestId('save-model-dir-button'));
    
    expect(mockProps.onSaveConfig).toHaveBeenCalled();
  });

  it('shows load server config button', () => {
    render(<GeneralTab {...mockProps} />);
    expect(screen.getByTestId('load-server-config-button')).toBeInTheDocument();
  });

  it('calls onLoadServerConfig when button clicked', async () => {
    const user = userEvent.setup();
    render(<GeneralTab {...mockProps} />);
    
    await user.click(screen.getByTestId('load-server-config-button'));
    
    expect(mockProps.onLoadServerConfig).toHaveBeenCalled();
  });

  it('displays verbose scan logs switch', () => {
    render(<GeneralTab {...mockProps} />);
    expect(screen.getByTestId('verbose-scan-logs-switch')).toBeInTheDocument();
  });
});
