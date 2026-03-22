import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { IntegrityTab } from '../../src/components/settings/IntegrityTab';
import { HashCheckResult, Model } from '../../src/types/model';
import userEvent from '@testing-library/user-event';

describe('IntegrityTab', () => {
  const mockModels: Model[] = [
    { id: '1', name: 'Model 1' } as Model,
    { id: '2', name: 'Model 2' } as Model,
  ];

  const mockDuplicateModels: Model[] = [
    { id: '3', name: 'Widget', modelUrl: '/models/prints/widget.3mf' } as Model,
    { id: '4', name: 'Widget', modelUrl: '/models/archive/widget.3mf' } as Model,
  ];

  const mockHashCheckResult: HashCheckResult = {
    verified: 10,
    corrupted: 2,
    duplicateGroups: [],
    corruptedFiles: [
      {
        model: mockModels[0],
        filePath: '/models/test.3mf',
        error: 'Hash mismatch',
        actualHash: 'abc123',
        expectedHash: 'def456',
      },
    ],
    corruptedFileDetails: [],
    lastCheck: new Date().toISOString(),
  };

  const mockProps = {
    models: mockModels,
    hashCheckResult: null,
    isHashChecking: false,
    hashCheckProgress: 0,
    generateResult: null,
    isGeneratingJson: false,
    selectedFileTypes: { "3mf": true, "stl": true } as { "3mf": boolean; "stl": boolean },
    onFileTypeChange: vi.fn(),
    onRunHashCheck: vi.fn().mockResolvedValue(undefined),
    onGenerateModelJson: vi.fn().mockResolvedValue(undefined),
    onRegenerate: vi.fn().mockResolvedValue(undefined),
    onRemoveDuplicates: vi.fn().mockResolvedValue(true),
  };

  it('renders the integrity tab', () => {
    render(<IntegrityTab {...mockProps} />);
    expect(screen.getByTestId('integrity-tab')).toBeInTheDocument();
  });

  it('displays file type checkboxes', () => {
    render(<IntegrityTab {...mockProps} />);
    
    expect(screen.getByTestId('file-type-3mf-checkbox')).toBeInTheDocument();
    expect(screen.getByTestId('file-type-stl-checkbox')).toBeInTheDocument();
  });

  it('displays run hash check button', () => {
    render(<IntegrityTab {...mockProps} />);
    expect(screen.getByTestId('run-hash-check-button')).toBeInTheDocument();
  });

  it('displays generate json button', () => {
    render(<IntegrityTab {...mockProps} />);
    expect(screen.getByTestId('generate-json-button')).toBeInTheDocument();
  });

  it('calls onRunHashCheck when button clicked', async () => {
    const user = userEvent.setup();
    render(<IntegrityTab {...mockProps} />);
    
    await user.click(screen.getByTestId('run-hash-check-button'));
    
    expect(mockProps.onRunHashCheck).toHaveBeenCalled();
  });

  it('calls onGenerateModelJson when button clicked', async () => {
    const user = userEvent.setup();
    render(<IntegrityTab {...mockProps} />);
    
    await user.click(screen.getByTestId('generate-json-button'));
    
    expect(mockProps.onGenerateModelJson).toHaveBeenCalled();
  });

  it('calls onFileTypeChange when checkbox toggled', async () => {
    const user = userEvent.setup();
    render(<IntegrityTab {...mockProps} />);
    
    await user.click(screen.getByTestId('file-type-3mf-checkbox'));
    
    expect(mockProps.onFileTypeChange).toHaveBeenCalledWith('3mf', false);
  });

  it('disables buttons when no file types selected', () => {
    const props = {
      ...mockProps,
      selectedFileTypes: { "3mf": false, "stl": false } as { "3mf": boolean; "stl": boolean },
    };
    
    render(<IntegrityTab {...props} />);
    
    expect(screen.getByTestId('run-hash-check-button')).toBeDisabled();
    expect(screen.getByTestId('generate-json-button')).toBeDisabled();
  });

  it('shows progress when hash checking', () => {
    const props = {
      ...mockProps,
      isHashChecking: true,
      hashCheckProgress: 50,
    };

    render(<IntegrityTab {...props} />);

    expect(screen.getByText('Checking files...')).toBeInTheDocument();
  });

  it('displays hash check results', () => {
    const props = {
      ...mockProps,
      hashCheckResult: mockHashCheckResult,
    };
    
    render(<IntegrityTab {...props} />);
    
    expect(screen.getByTestId('integrity-results')).toBeInTheDocument();
    expect(screen.getByTestId('verified-count')).toHaveTextContent('10 verified');
    expect(screen.getByTestId('corrupted-count')).toHaveTextContent('2 issues');
  });

  it('displays corrupted files list', () => {
    const props = {
      ...mockProps,
      hashCheckResult: mockHashCheckResult,
    };
    
    render(<IntegrityTab {...props} />);
    
    expect(screen.getByTestId('corrupted-files-list')).toBeInTheDocument();
    expect(screen.getByTestId('corrupted-file-0')).toBeInTheDocument();
  });

  it('shows regenerate button for corrupted files with hash mismatch', () => {
    const props = {
      ...mockProps,
      hashCheckResult: mockHashCheckResult,
    };
    
    render(<IntegrityTab {...props} />);
    
    expect(screen.getByTestId('regenerate-button-0')).toBeInTheDocument();
  });

  it('calls onRegenerate when regenerate button clicked', async () => {
    const user = userEvent.setup();
    const props = {
      ...mockProps,
      hashCheckResult: mockHashCheckResult,
    };
    
    render(<IntegrityTab {...props} />);
    
    await user.click(screen.getByTestId('regenerate-button-0'));
    
    expect(mockProps.onRegenerate).toHaveBeenCalled();
  });

  it('displays duplicate groups list', () => {
    const props = {
      ...mockProps,
      hashCheckResult: {
        ...mockHashCheckResult,
        duplicateGroups: [{ hash: 'abc', models: mockDuplicateModels, totalSize: '2 MB' }],
      },
    };

    render(<IntegrityTab {...props} />);

    expect(screen.getByTestId('duplicate-groups-list')).toBeInTheDocument();
    expect(screen.getByTestId('duplicates-count')).toHaveTextContent('1 duplicates');
  });

  it('shows file paths in duplicate entries', () => {
    const props = {
      ...mockProps,
      hashCheckResult: {
        ...mockHashCheckResult,
        duplicateGroups: [{ hash: 'abc', models: mockDuplicateModels, totalSize: '2 MB' }],
      },
    };

    render(<IntegrityTab {...props} />);

    expect(screen.getByText('prints/widget.3mf')).toBeInTheDocument();
    expect(screen.getByText('archive/widget.3mf')).toBeInTheDocument();
  });

  it('calls onModelClick when duplicate model row is clicked', async () => {
    const onModelClick = vi.fn();
    const props = {
      ...mockProps,
      onModelClick,
      hashCheckResult: {
        ...mockHashCheckResult,
        duplicateGroups: [{ hash: 'abc', models: mockDuplicateModels, totalSize: '2 MB' }],
      },
    };

    render(<IntegrityTab {...props} />);

    fireEvent.click(screen.getByText('Remove Duplicates'));
    fireEvent.click(screen.getByTestId(`duplicate-model-info-${mockDuplicateModels[0].id}`));

    expect(onModelClick).toHaveBeenCalledWith(mockDuplicateModels[0]);
  });

  it('calls onRemoveDuplicates with correct group and model id when Keep This clicked', async () => {
    const user = userEvent.setup();
    const onRemoveDuplicates = vi.fn().mockResolvedValue(true);
    const props = {
      ...mockProps,
      onRemoveDuplicates,
      hashCheckResult: {
        ...mockHashCheckResult,
        duplicateGroups: [{ hash: 'abc', models: mockDuplicateModels, totalSize: '2 MB' }],
      },
    };

    render(<IntegrityTab {...props} />);

    await user.click(screen.getByText('Remove Duplicates'));
    await user.click(screen.getAllByText('Keep This')[0]);

    expect(onRemoveDuplicates).toHaveBeenCalledWith(
      { hash: 'abc', models: mockDuplicateModels, totalSize: '2 MB' },
      mockDuplicateModels[0].id,
    );
  });

  it('displays generate results', () => {
    const props = {
      ...mockProps,
      generateResult: { processed: 5, skipped: 2 },
    };
    
    render(<IntegrityTab {...props} />);
    
    expect(screen.getByTestId('processed-count')).toHaveTextContent('5 processed');
    expect(screen.getByTestId('skipped-count')).toHaveTextContent('2 skipped');
  });
});
