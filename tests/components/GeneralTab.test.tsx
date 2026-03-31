import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GeneralTab } from '../../src/components/settings/GeneralTab';
import { AppConfig } from '../../src/types/config';
import userEvent from '@testing-library/user-event';

describe('GeneralTab', () => {
  const mockConfig: AppConfig = {
    categories: [],
    settings: {
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

  it('renders currency symbol input with default value', () => {
    render(<GeneralTab {...mockProps} />);
    const input = screen.getByTestId('currency-symbol-input') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('$');
  });

  it('renders currency symbol input with configured value', () => {
    const configWithEuro = {
      ...mockConfig,
      settings: { ...mockConfig.settings, currencySymbol: '€' },
    };
    render(<GeneralTab {...mockProps} config={configWithEuro} />);
    const input = screen.getByTestId('currency-symbol-input') as HTMLInputElement;
    expect(input.value).toBe('€');
  });

  it('calls onConfigFieldChange when currency symbol changes', async () => {
    const user = userEvent.setup();
    const onConfigFieldChange = vi.fn();
    render(<GeneralTab {...mockProps} onConfigFieldChange={onConfigFieldChange} />);
    const input = screen.getByTestId('currency-symbol-input');
    await user.clear(input);
    await user.type(input, '€');
    expect(onConfigFieldChange).toHaveBeenCalledWith('settings.currencySymbol', expect.any(String));
  });

  it('renders default model color input with fallback value', () => {
    render(<GeneralTab {...mockProps} />);
    const input = screen.getByTestId('default-model-color-input') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.type).toBe('color');
    expect(input.value).toBe('#aaaaaa');
  });

  it('renders default model color input with configured value', () => {
    const configWithColor = {
      ...mockConfig,
      settings: { ...mockConfig.settings, defaultModelColor: '#ff0000' },
    };
    render(<GeneralTab {...mockProps} config={configWithColor} />);
    const input = screen.getByTestId('default-model-color-input') as HTMLInputElement;
    expect(input.value).toBe('#ff0000');
  });

  it('calls onConfigFieldChange when model color changes', async () => {
    const user = userEvent.setup();
    const onConfigFieldChange = vi.fn();
    render(<GeneralTab {...mockProps} onConfigFieldChange={onConfigFieldChange} />);
    const input = screen.getByTestId('default-model-color-input');
    await user.click(input);
    fireEvent.change(input, { target: { value: '#336699' } });
    expect(onConfigFieldChange).toHaveBeenCalledWith('settings.defaultModelColor', '#336699');
  });
});
