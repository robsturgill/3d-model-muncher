import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConfigTab } from '../../src/components/settings/ConfigTab';
import userEvent from '@testing-library/user-event';

describe('ConfigTab', () => {
  const mockProps = {
    onExportConfig: vi.fn(),
    onImportConfig: vi.fn(),
    onResetConfig: vi.fn(),
    onSaveConfig: vi.fn(),
    onLoadServerConfig: vi.fn().mockResolvedValue(undefined),
  };

  it('renders the config tab', () => {
    render(<ConfigTab {...mockProps} />);
    expect(screen.getByTestId('config-tab')).toBeInTheDocument();
  });

  it('displays export config button', () => {
    render(<ConfigTab {...mockProps} />);
    expect(screen.getByTestId('export-config-button')).toBeInTheDocument();
  });

  it('displays import config button', () => {
    render(<ConfigTab {...mockProps} />);
    expect(screen.getByTestId('import-config-button')).toBeInTheDocument();
  });

  it('displays reset config button', () => {
    render(<ConfigTab {...mockProps} />);
    expect(screen.getByTestId('reset-config-button')).toBeInTheDocument();
  });

  it('displays save config button', () => {
    render(<ConfigTab {...mockProps} />);
    expect(screen.getByTestId('save-config-button')).toBeInTheDocument();
  });

  it('displays load config button', () => {
    render(<ConfigTab {...mockProps} />);
    expect(screen.getByTestId('load-config-button')).toBeInTheDocument();
  });

  it('calls onExportConfig when export button clicked', async () => {
    const user = userEvent.setup();
    render(<ConfigTab {...mockProps} />);
    
    await user.click(screen.getByTestId('export-config-button'));
    
    expect(mockProps.onExportConfig).toHaveBeenCalled();
  });

  it('calls onImportConfig when import button clicked', async () => {
    const user = userEvent.setup();
    render(<ConfigTab {...mockProps} />);
    
    await user.click(screen.getByTestId('import-config-button'));
    
    expect(mockProps.onImportConfig).toHaveBeenCalled();
  });

  it('calls onResetConfig when reset button clicked', async () => {
    const user = userEvent.setup();
    render(<ConfigTab {...mockProps} />);
    
    await user.click(screen.getByTestId('reset-config-button'));
    
    expect(mockProps.onResetConfig).toHaveBeenCalled();
  });

  it('calls onSaveConfig when save button clicked', async () => {
    const user = userEvent.setup();
    render(<ConfigTab {...mockProps} />);
    
    await user.click(screen.getByTestId('save-config-button'));
    
    expect(mockProps.onSaveConfig).toHaveBeenCalled();
  });

  it('calls onLoadServerConfig when load button clicked', async () => {
    const user = userEvent.setup();
    render(<ConfigTab {...mockProps} />);
    
    await user.click(screen.getByTestId('load-config-button'));
    
    expect(mockProps.onLoadServerConfig).toHaveBeenCalled();
  });
});
