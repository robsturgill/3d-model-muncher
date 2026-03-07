import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TagsTab } from '../../src/components/settings/TagsTab';
import { Model } from '../../src/types/model';
import userEvent from '@testing-library/user-event';

describe('TagsTab', () => {
  const mockModels: Model[] = [
    { id: '1', name: 'Model 1', tags: ['toy', 'game'] } as Model,
    { id: '2', name: 'Model 2', tags: ['toy', 'miniature'] } as Model,
    { id: '3', name: 'Model 3', tags: ['tool'] } as Model,
  ];

  const mockProps = {
    models: mockModels,
    onRenameTag: vi.fn().mockResolvedValue(undefined),
    onDeleteTag: vi.fn().mockResolvedValue(undefined),
    onViewTagModels: vi.fn(),
  };

  it('renders the tags tab', () => {
    render(<TagsTab {...mockProps} />);
    expect(screen.getByTestId('tags-tab')).toBeInTheDocument();
  });

  it('displays tag statistics', () => {
    render(<TagsTab {...mockProps} />);
    
    expect(screen.getByTestId('total-tags-count')).toHaveTextContent('4');
    expect(screen.getByTestId('total-usages-count')).toHaveTextContent('5');
    expect(screen.getByTestId('avg-usage-count')).toBeInTheDocument();
  });

  it('displays tag search input', () => {
    render(<TagsTab {...mockProps} />);
    expect(screen.getByTestId('tag-search-input')).toBeInTheDocument();
  });

  it('displays all tags', () => {
    render(<TagsTab {...mockProps} />);
    
    expect(screen.getByTestId('tag-item-toy')).toBeInTheDocument();
    expect(screen.getByTestId('tag-item-game')).toBeInTheDocument();
    expect(screen.getByTestId('tag-item-miniature')).toBeInTheDocument();
    expect(screen.getByTestId('tag-item-tool')).toBeInTheDocument();
  });

  it('filters tags based on search', async () => {
    const user = userEvent.setup();
    render(<TagsTab {...mockProps} />);
    
    const searchInput = screen.getByTestId('tag-search-input');
    await user.type(searchInput, 'toy');
    
    expect(screen.getByTestId('tag-item-toy')).toBeInTheDocument();
    expect(screen.queryByTestId('tag-item-tool')).not.toBeInTheDocument();
  });

  it('clears search when X button clicked', async () => {
    const user = userEvent.setup();
    render(<TagsTab {...mockProps} />);
    
    const searchInput = screen.getByTestId('tag-search-input');
    await user.type(searchInput, 'toy');
    
    await user.click(screen.getByTestId('clear-tag-search'));
    
    expect(searchInput).toHaveValue('');
  });

  it('shows rename button for each tag', () => {
    render(<TagsTab {...mockProps} />);
    
    expect(screen.getByTestId('rename-tag-toy')).toBeInTheDocument();
    expect(screen.getByTestId('rename-tag-game')).toBeInTheDocument();
  });

  it('shows delete button for each tag', () => {
    render(<TagsTab {...mockProps} />);
    
    expect(screen.getByTestId('delete-tag-toy')).toBeInTheDocument();
    expect(screen.getByTestId('delete-tag-game')).toBeInTheDocument();
  });

  it('opens rename dialog when rename button clicked', async () => {
    const user = userEvent.setup();
    render(<TagsTab {...mockProps} />);
    
    await user.click(screen.getByTestId('rename-tag-toy'));
    
    expect(screen.getByTestId('rename-tag-dialog')).toBeInTheDocument();
  });

  it('allows renaming a tag', async () => {
    const user = userEvent.setup();
    render(<TagsTab {...mockProps} />);
    
    await user.click(screen.getByTestId('rename-tag-toy'));
    
    const input = screen.getByTestId('rename-tag-input');
    await user.clear(input);
    await user.type(input, 'toys');
    
    await user.click(screen.getByTestId('confirm-rename-tag-button'));
    
    expect(mockProps.onRenameTag).toHaveBeenCalledWith('toy', 'toys');
  });

  it('calls onDeleteTag when delete button clicked', async () => {
    const user = userEvent.setup();
    render(<TagsTab {...mockProps} />);
    
    await user.click(screen.getByTestId('delete-tag-toy'));
    
    expect(mockProps.onDeleteTag).toHaveBeenCalledWith('toy');
  });

  it('calls onViewTagModels when view button clicked', async () => {
    const user = userEvent.setup();
    render(<TagsTab {...mockProps} />);
    
    await user.click(screen.getByTestId('view-tag-toy'));
    
    expect(mockProps.onViewTagModels).toHaveBeenCalled();
  });

  it('does not show view button when onViewTagModels not provided', () => {
    const { onViewTagModels, ...propsWithoutView } = mockProps;
    render(<TagsTab {...propsWithoutView} />);
    
    expect(screen.queryByTestId('view-tag-toy')).not.toBeInTheDocument();
  });
});
