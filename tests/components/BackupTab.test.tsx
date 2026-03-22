import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BackupTab } from '../../src/components/settings/BackupTab';
import userEvent from '@testing-library/user-event';

describe('BackupTab', () => {
  const mockModels = [
    { id: '1', name: 'Model 1' },
    { id: '2', name: 'Model 2' },
    { id: '3', name: 'Model 3' },
  ];

  const mockProps = {
    models: mockModels,
    backupHistory: [],
    onCreateBackup: vi.fn().mockResolvedValue(undefined),
    onRestoreFromFile: vi.fn(),
  };

  it('renders the backup tab', () => {
    render(<BackupTab {...mockProps} />);
    expect(screen.getByTestId('backup-tab')).toBeInTheDocument();
  });

  it('displays create backup button', () => {
    render(<BackupTab {...mockProps} />);
    expect(screen.getByTestId('create-backup-button')).toBeInTheDocument();
  });

  it('displays models count', () => {
    render(<BackupTab {...mockProps} />);
    expect(screen.getByTestId('models-count')).toHaveTextContent('3');
  });

  it('calls onCreateBackup when create button clicked', async () => {
    const user = userEvent.setup();
    render(<BackupTab {...mockProps} />);
    
    await user.click(screen.getByTestId('create-backup-button'));
    
    expect(mockProps.onCreateBackup).toHaveBeenCalled();
  });

  it('disables create button while creating backup', async () => {
    const user = userEvent.setup();
    let resolveBackup: () => void;
    const backupPromise = new Promise<void>((resolve) => {
      resolveBackup = resolve;
    });
    
    const props = {
      ...mockProps,
      onCreateBackup: vi.fn(() => backupPromise),
    };
    
    render(<BackupTab {...props} />);
    
    const button = screen.getByTestId('create-backup-button');
    await user.click(button);
    
    expect(button).toBeDisabled();
    
    resolveBackup!();
  });

  it('displays restore strategy select', () => {
    render(<BackupTab {...mockProps} />);
    expect(screen.getByTestId('restore-strategy-select')).toBeInTheDocument();
  });

  it('displays collections strategy select', () => {
    render(<BackupTab {...mockProps} />);
    expect(screen.getByTestId('collections-strategy-select')).toBeInTheDocument();
  });

  it('displays restore from file button', () => {
    render(<BackupTab {...mockProps} />);
    expect(screen.getByTestId('restore-from-file-button')).toBeInTheDocument();
  });

  it('calls onRestoreFromFile with default strategies when restore button clicked', async () => {
    const user = userEvent.setup();
    render(<BackupTab {...mockProps} />);

    await user.click(screen.getByTestId('restore-from-file-button'));

    expect(mockProps.onRestoreFromFile).toHaveBeenCalledWith('hash-match', 'merge');
  });

  it('passes selected restore strategy to onRestoreFromFile', async () => {
    const user = userEvent.setup();
    const onRestoreFromFile = vi.fn();
    render(<BackupTab {...mockProps} onRestoreFromFile={onRestoreFromFile} />);

    const strategySelect = screen.getByTestId('restore-strategy-select').closest('select')!;
    fireEvent.change(strategySelect, { target: { value: 'force' } });

    await user.click(screen.getByTestId('restore-from-file-button'));

    expect(onRestoreFromFile).toHaveBeenCalledWith('force', 'merge');
  });

  it('passes selected collections strategy to onRestoreFromFile', async () => {
    const user = userEvent.setup();
    const onRestoreFromFile = vi.fn();
    render(<BackupTab {...mockProps} onRestoreFromFile={onRestoreFromFile} />);

    const collectionsSelect = screen.getByTestId('collections-strategy-select').closest('select')!;
    fireEvent.change(collectionsSelect, { target: { value: 'replace' } });

    await user.click(screen.getByTestId('restore-from-file-button'));

    expect(onRestoreFromFile).toHaveBeenCalledWith('hash-match', 'replace');
  });

  it('shows last backup size from backupHistory', () => {
    const props = {
      ...mockProps,
      backupHistory: [{ name: 'backup.gz', timestamp: new Date().toISOString(), size: 20480, fileCount: 5 }],
    };
    render(<BackupTab {...props} />);
    expect(screen.getByTestId('last-backup-size')).toHaveTextContent('20.0KB');
  });

  it('shows 0KB when backupHistory is empty', () => {
    render(<BackupTab {...mockProps} />);
    expect(screen.getByTestId('last-backup-size')).toHaveTextContent('0KB');
  });
});
