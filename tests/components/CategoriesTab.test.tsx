import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CategoriesTab } from '../../src/components/settings/CategoriesTab';
import { Category } from '../../src/types/category';
import { Model } from '../../src/types/model';
import userEvent from '@testing-library/user-event';

describe('CategoriesTab', () => {
  const mockCategories: Category[] = [
    { id: 'uncategorized', label: 'Uncategorized', icon: 'Folder' },
    { id: 'toys', label: 'Toys', icon: 'Box' },
    { id: 'tools', label: 'Tools', icon: 'Wrench' },
  ];

  const mockModels: Model[] = [
    { id: '1', name: 'Model 1', category: 'Toys' } as Model,
    { id: '2', name: 'Model 2', category: 'Toys' } as Model,
    { id: '3', name: 'Model 3', category: 'Tools' } as Model,
  ];

  const mockProps = {
    categories: mockCategories,
    models: mockModels,
    onCategoriesUpdate: vi.fn(),
    onSaveCategories: vi.fn(),
    onRenameCategory: vi.fn().mockResolvedValue(undefined),
    onDeleteCategory: vi.fn().mockResolvedValue(undefined),
    onAddCategory: vi.fn().mockResolvedValue(undefined),
    categorySortOrder: 'custom' as const,
    onCategorySortOrderChange: vi.fn(),
  };

  it('renders the categories tab', () => {
    render(<CategoriesTab {...mockProps} />);
    expect(screen.getByTestId('categories-tab')).toBeInTheDocument();
  });

  it('displays all categories', () => {
    render(<CategoriesTab {...mockProps} />);
    
    expect(screen.getByTestId('category-item-uncategorized')).toBeInTheDocument();
    expect(screen.getByTestId('category-item-toys')).toBeInTheDocument();
    expect(screen.getByTestId('category-item-tools')).toBeInTheDocument();
  });

  it('shows model count for each category', () => {
    render(<CategoriesTab {...mockProps} />);
    
    expect(screen.getByText(/Used in 2 models/)).toBeInTheDocument(); // Toys
    expect(screen.getByText(/Used in 1 model/)).toBeInTheDocument(); // Tools
  });

  it('shows save button', () => {
    render(<CategoriesTab {...mockProps} />);
    expect(screen.getByTestId('save-categories-button')).toBeInTheDocument();
  });

  it('shows add category button', () => {
    render(<CategoriesTab {...mockProps} />);
    expect(screen.getByTestId('add-category-button')).toBeInTheDocument();
  });

  it('opens add category dialog when add button clicked', async () => {
    const user = userEvent.setup();
    render(<CategoriesTab {...mockProps} />);
    
    await user.click(screen.getByTestId('add-category-button'));
    
    expect(screen.getByTestId('add-category-dialog')).toBeInTheDocument();
  });

  it('allows adding a new category', async () => {
    const user = userEvent.setup();
    render(<CategoriesTab {...mockProps} />);
    
    await user.click(screen.getByTestId('add-category-button'));
    
    const nameInput = screen.getByTestId('new-category-input');
    await user.type(nameInput, 'Games');
    
    const iconInput = screen.getByTestId('new-category-icon-input');
    await user.clear(iconInput);
    await user.type(iconInput, 'Gamepad');
    
    await user.click(screen.getByTestId('confirm-add-button'));
    
    expect(mockProps.onAddCategory).toHaveBeenCalledWith('Games', 'Gamepad');
  });

  it('shows edit button for non-uncategorized categories', () => {
    render(<CategoriesTab {...mockProps} />);
    
    expect(screen.getByTestId('edit-category-toys')).toBeInTheDocument();
    expect(screen.getByTestId('edit-category-tools')).toBeInTheDocument();
  });

  it('does not show edit button for uncategorized', () => {
    render(<CategoriesTab {...mockProps} />);
    
    expect(screen.queryByTestId('edit-category-uncategorized')).not.toBeInTheDocument();
  });

  it('opens rename dialog when edit clicked', async () => {
    const user = userEvent.setup();
    render(<CategoriesTab {...mockProps} />);
    
    await user.click(screen.getByTestId('edit-category-toys'));
    
    expect(screen.getByTestId('rename-category-dialog')).toBeInTheDocument();
  });

  it('allows renaming a category', async () => {
    const user = userEvent.setup();
    render(<CategoriesTab {...mockProps} />);
    
    await user.click(screen.getByTestId('edit-category-toys'));
    
    const nameInput = screen.getByTestId('rename-category-input');
    await user.clear(nameInput);
    await user.type(nameInput, 'Games');
    
    await user.click(screen.getByTestId('confirm-rename-button'));
    
    expect(mockProps.onRenameCategory).toHaveBeenCalledWith('toys', 'games', 'Games', 'Box');
  });

  it('calls onSaveCategories when save button clicked', async () => {
    const user = userEvent.setup();
    render(<CategoriesTab {...mockProps} />);

    await user.click(screen.getByTestId('save-categories-button'));

    expect(mockProps.onSaveCategories).toHaveBeenCalled();
  });

  describe('sort order toggle', () => {
    it('renders Custom Order and Alphabetical buttons', () => {
      render(<CategoriesTab {...mockProps} />);
      expect(screen.getByText('Custom Order')).toBeInTheDocument();
      expect(screen.getByText('Alphabetical')).toBeInTheDocument();
    });

    it('calls onCategorySortOrderChange("alpha") when Alphabetical clicked', async () => {
      const user = userEvent.setup();
      const onCategorySortOrderChange = vi.fn();
      render(<CategoriesTab {...mockProps} onCategorySortOrderChange={onCategorySortOrderChange} />);

      await user.click(screen.getByText('Alphabetical'));

      expect(onCategorySortOrderChange).toHaveBeenCalledWith('alpha');
    });

    it('calls onCategorySortOrderChange("custom") when Custom Order clicked', async () => {
      const user = userEvent.setup();
      const onCategorySortOrderChange = vi.fn();
      render(<CategoriesTab {...mockProps} categorySortOrder="alpha" onCategorySortOrderChange={onCategorySortOrderChange} />);

      await user.click(screen.getByText('Custom Order'));

      expect(onCategorySortOrderChange).toHaveBeenCalledWith('custom');
    });
  });

  describe('unmapped categories', () => {
    const modelsWithUnmapped: Model[] = [
      ...mockModels,
      { id: '4', name: 'Model 4', category: 'Holder' } as Model,
      { id: '5', name: 'Model 5', category: 'Holder' } as Model,
    ];

    it('shows unmapped categories section when model has an unlisted category', () => {
      render(<CategoriesTab {...mockProps} models={modelsWithUnmapped} />);
      expect(screen.getByText('Unmapped Categories')).toBeInTheDocument();
      expect(screen.getByText('Holder')).toBeInTheDocument();
    });

    it('does not show unmapped categories section when all models match configured categories', () => {
      render(<CategoriesTab {...mockProps} />);
      expect(screen.queryByText('Unmapped Categories')).not.toBeInTheDocument();
    });

    it('calls onAddCategory when Add button clicked for an unmapped category', async () => {
      const user = userEvent.setup();
      const onAddCategory = vi.fn().mockResolvedValue(undefined);
      render(<CategoriesTab {...mockProps} models={modelsWithUnmapped} onAddCategory={onAddCategory} />);

      await user.click(screen.getByText('Unmapped Categories').closest('div')!.querySelector('button')!);

      expect(onAddCategory).toHaveBeenCalledWith('Holder', 'Folder');
    });
  });

  describe('delete category', () => {
    it('shows Delete button inside rename dialog', async () => {
      const user = userEvent.setup();
      render(<CategoriesTab {...mockProps} />);

      await user.click(screen.getByTestId('edit-category-toys'));

      expect(screen.getByTestId('delete-category-button')).toBeInTheDocument();
    });

    it('opens delete confirmation dialog when Delete clicked', async () => {
      const user = userEvent.setup();
      render(<CategoriesTab {...mockProps} />);

      await user.click(screen.getByTestId('edit-category-toys'));
      await user.click(screen.getByTestId('delete-category-button'));

      expect(screen.getByTestId('delete-category-confirm-dialog')).toBeInTheDocument();
    });

    it('calls onDeleteCategory with category id when Confirm Delete clicked', async () => {
      const user = userEvent.setup();
      const onDeleteCategory = vi.fn().mockResolvedValue(undefined);
      render(<CategoriesTab {...mockProps} onDeleteCategory={onDeleteCategory} />);

      await user.click(screen.getByTestId('edit-category-toys'));
      await user.click(screen.getByTestId('delete-category-button'));
      await user.click(screen.getByTestId('confirm-delete-button'));

      expect(onDeleteCategory).toHaveBeenCalledWith('toys');
    });

    it('closes confirmation dialog without deleting when Cancel clicked', async () => {
      const user = userEvent.setup();
      const onDeleteCategory = vi.fn().mockResolvedValue(undefined);
      render(<CategoriesTab {...mockProps} onDeleteCategory={onDeleteCategory} />);

      await user.click(screen.getByTestId('edit-category-toys'));
      await user.click(screen.getByTestId('delete-category-button'));
      await user.click(screen.getByTestId('cancel-delete-button'));

      expect(onDeleteCategory).not.toHaveBeenCalled();
      expect(screen.queryByTestId('delete-category-confirm-dialog')).not.toBeInTheDocument();
    });

    it('shows affected model count in confirmation dialog', async () => {
      const user = userEvent.setup();
      render(<CategoriesTab {...mockProps} />);

      await user.click(screen.getByTestId('edit-category-toys'));
      await user.click(screen.getByTestId('delete-category-button'));

      // Toys has 2 models in mockModels
      expect(screen.getByText(/2 models will be moved/)).toBeInTheDocument();
    });
  });
});
