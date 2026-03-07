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
    
    expect(mockProps.onRenameCategory).toHaveBeenCalledWith('toys', 'games', 'Games');
  });

  it('calls onSaveCategories when save button clicked', async () => {
    const user = userEvent.setup();
    render(<CategoriesTab {...mockProps} />);
    
    await user.click(screen.getByTestId('save-categories-button'));
    
    expect(mockProps.onSaveCategories).toHaveBeenCalled();
  });
});
