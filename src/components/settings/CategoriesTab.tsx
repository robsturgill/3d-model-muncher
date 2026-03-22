import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { GripVertical, Edit2, Plus, Save, X } from "lucide-react";
import { Category } from "../../types/category";
import { Model } from "../../types/model";
import { useState, useMemo } from "react";
import * as LucideIcons from 'lucide-react';

interface CategoriesTabProps {
  categories: Category[];
  models: Model[];
  onCategoriesUpdate: (categories: Category[]) => void;
  onSaveCategories: () => void;
  onRenameCategory: (oldId: string, newId: string, newLabel: string, icon?: string) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
  onAddCategory: (label: string, icon: string) => Promise<void>;
  categorySortOrder: 'custom' | 'alpha';
  onCategorySortOrderChange: (order: 'custom' | 'alpha') => void;
}

export function CategoriesTab({
  categories,
  models,
  onCategoriesUpdate,
  onSaveCategories,
  onRenameCategory,
  onDeleteCategory,
  onAddCategory,
  categorySortOrder,
  onCategorySortOrderChange,
}: CategoriesTabProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [renameCategoryValue, setRenameCategoryValue] = useState('');
  const [renameCategoryIcon, setRenameCategoryIcon] = useState('Folder');
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('Folder');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [pendingDeleteCount, setPendingDeleteCount] = useState(0);

  const unmappedCategories = useMemo(() => {
    const configuredLabels = new Set(categories.map(c => c.label.toLowerCase()));
    const counts: Record<string, number> = {};
    models.forEach(m => {
      const raw = (m.category ?? '').toString().trim();
      if (!raw) return;
      if (!configuredLabels.has(raw.toLowerCase())) {
        counts[raw] = (counts[raw] || 0) + 1;
      }
    });
    return Object.keys(counts).map(label => ({ label, count: counts[label] })).sort((a, b) => b.count - a.count);
  }, [models, categories]);

  const iconExists = (name?: string) => {
    const normalized = normalizeIconName(name);
    return !!normalized && !!(LucideIcons as any)[normalized];
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newCategories = [...categories];
    const draggedItem = newCategories[draggedIndex];
    newCategories.splice(draggedIndex, 1);
    newCategories.splice(index, 0, draggedItem);
    
    onCategoriesUpdate(newCategories);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const normalizeIconName = (input?: string) => {
    if (!input) return 'Folder';
    const cleaned = input.trim().replace(/\.(svg|js|tsx?)$/i, '').replace(/[^a-z0-9-_ ]/gi, '');
    if (!cleaned) return 'Folder';
    const parts = cleaned.split(/[-_\s]+/).filter(Boolean);
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  };

  const getLucideIconComponent = (iconName?: string) => {
    const name = normalizeIconName(iconName);
    const Comp = (LucideIcons as any)[name] as React.ComponentType<any> | undefined;
    if (Comp) return Comp;
    return (LucideIcons as any)['Folder'] as React.ComponentType<any>;
  };

  const startRenameCategory = (category: Category) => {
    setSelectedCategory(category);
    setRenameCategoryValue(category.label);
    setRenameCategoryIcon(category.icon || 'Folder');
    setIsRenameDialogOpen(true);
  };

  return (
    <div data-testid="categories-tab">
      {/* Sort Order Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-medium text-foreground">Display order:</span>
        <div className="flex rounded-md border border-border overflow-hidden">
          <Button
            variant={categorySortOrder === 'custom' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none border-0"
            onClick={() => onCategorySortOrderChange('custom')}
          >
            Custom Order
          </Button>
          <Button
            variant={categorySortOrder === 'alpha' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none border-0 border-l border-border"
            onClick={() => onCategorySortOrderChange('alpha')}
          >
            Alphabetical
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>
            Drag and drop to reorder categories. Click edit to rename categories and update all associated models.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2" data-testid="categories-list">
            {(categorySortOrder === 'alpha'
              ? [...categories].sort((a, b) => {
                  if (a.label === 'Uncategorized') return -1;
                  if (b.label === 'Uncategorized') return 1;
                  return a.label.localeCompare(b.label);
                })
              : categories
            ).map((category, index) => {
              const IconComp = getLucideIconComponent(category.icon);
              const modelCount = models.filter(m => m.category === category.label).length;

              return (
                <div
                  key={category.id}
                  draggable={categorySortOrder === 'custom'}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  data-testid={`category-item-${category.id}`}
                  className={`
                    flex items-center gap-3 p-3 bg-muted rounded-lg border border-border
                    ${categorySortOrder === 'custom' ? 'cursor-move' : 'cursor-default'} hover:bg-accent/50 transition-colors duration-200
                    ${draggedIndex === index ? 'opacity-50' : ''}
                  `}
                >
                  {categorySortOrder === 'custom' && (<GripVertical className="h-4 w-4 text-muted-foreground" />)}
                  <div className="flex items-center gap-2">
                    <IconComp className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline" className="font-medium">
                      {category.label}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground hidden sm:inline">
                    Used in {modelCount} model{modelCount !== 1 ? 's' : ''}
                  </span>
                  <div className="flex items-center gap-2 ml-auto">
                    {!(category.id === 'uncategorized' || category.label === 'Uncategorized') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startRenameCategory(category)}
                        data-testid={`edit-category-${category.id}`}
                        className="gap-2"
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {unmappedCategories.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Unmapped Categories</h4>
              <p className="text-xs text-muted-foreground">Categories found in model metadata that are not defined in your configuration. You can add them as configured categories.</p>
              <div className="space-y-2 mt-2">
                {unmappedCategories.map((uc) => (
                  <div key={uc.label} className="flex items-center gap-3 p-3 bg-muted/60 rounded-lg border border-border">
                    <div className="flex items-center gap-2">
                      <LucideIcons.Box className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline" className="font-medium">{uc.label}</Badge>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-sm text-muted-foreground hidden sm:inline">Used in {uc.count} model{uc.count !== 1 ? 's' : ''}</span>
                      <Button size="sm" variant="ghost" className="gap-2" onClick={() => onAddCategory(uc.label, 'Folder')}>
                        <Plus className="h-4 w-4" />
                        Add
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              onClick={onSaveCategories}
              data-testid="save-categories-button"
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save Category Order
            </Button>

            <Button
              variant="secondary"
              onClick={() => setIsAddDialogOpen(true)}
              data-testid="add-category-button"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent data-testid="rename-category-dialog">
          <DialogHeader>
            <DialogTitle>Rename Category</DialogTitle>
            <DialogDescription>
              This will rename the category across all models that use it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rename-category">New category name</Label>
              <Input
                id="rename-category"
                data-testid="rename-category-input"
                value={renameCategoryValue}
                onChange={(e) => setRenameCategoryValue(e.target.value)}
                placeholder="Enter new category name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rename-category-icon">Icon (Lucide name)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="rename-category-icon"
                  data-testid="rename-category-icon-input"
                  value={renameCategoryIcon}
                  onChange={(e) => setRenameCategoryIcon(e.target.value)}
                  placeholder="e.g. tag, box, heart"
                />
                <div className="w-8 h-8 shrink-0 flex items-center justify-center bg-muted rounded border">
                  {(() => { const I = getLucideIconComponent(renameCategoryIcon); return <I className="h-4 w-4 text-muted-foreground" />; })()}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Browse available icons at{' '}
                <a href="https://lucide.dev/icons/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                  lucide.dev/icons
                </a>
                . Use the icon name in kebab-case (e.g. <code className="text-xs">box</code>, <code className="text-xs">file-box</code>).
              </p>
              {!iconExists(renameCategoryIcon) && (
                <p className="text-xs text-destructive">Icon not found — will fall back to the Folder icon.</p>
              )}
            </div>
          </div>
          <DialogFooter className="flex justify-between items-center">
            <div className="flex-1 flex justify-start">
              <Button
                variant="destructive"
                data-testid="delete-category-button"
                disabled={!selectedCategory}
                onClick={() => {
                  if (!selectedCategory) return;
                  const count = models.reduce((acc, m) => acc + (m.category === selectedCategory.label ? 1 : 0), 0);
                  setPendingDeleteCount(count);
                  setIsRenameDialogOpen(false);
                  setIsDeleteConfirmOpen(true);
                }}
              >
                Delete
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsRenameDialogOpen(false)}
                data-testid="cancel-rename-button"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (selectedCategory && renameCategoryValue.trim()) {
                    const newId = renameCategoryValue.trim().toLowerCase().replace(/\s+/g, '_');
                    await onRenameCategory(selectedCategory.id, newId, renameCategoryValue.trim(), renameCategoryIcon);
                    setIsRenameDialogOpen(false);
                  }
                }}
                data-testid="confirm-rename-button"
                disabled={!renameCategoryValue.trim()}
              >
                Rename Category
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent data-testid="delete-category-confirm-dialog">
          <DialogHeader>
            <DialogTitle>Confirm Delete Category</DialogTitle>
            <DialogDescription>
              {pendingDeleteCount} model{pendingDeleteCount !== 1 ? 's' : ''} will be moved to "Uncategorized".
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone. Are you sure you want to delete this category?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} data-testid="cancel-delete-button">
              Cancel
            </Button>
            <Button
              variant="destructive"
              data-testid="confirm-delete-button"
              onClick={async () => {
                if (selectedCategory) {
                  setIsDeleteConfirmOpen(false);
                  await onDeleteCategory(selectedCategory.id);
                }
              }}
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="add-category-dialog">
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>
              Create a new category for organizing your models.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-category">Category name</Label>
              <Input
                id="new-category"
                data-testid="new-category-input"
                value={newCategoryLabel}
                onChange={(e) => setNewCategoryLabel(e.target.value)}
                placeholder="Enter category name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-category-icon">Icon (Lucide name)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="new-category-icon"
                  data-testid="new-category-icon-input"
                  value={newCategoryIcon}
                  onChange={(e) => setNewCategoryIcon(e.target.value)}
                  placeholder="e.g. tag, box, heart"
                />
                <div className="w-8 h-8 shrink-0 flex items-center justify-center bg-muted rounded border">
                  {(() => { const I = getLucideIconComponent(newCategoryIcon); return <I className="h-4 w-4 text-muted-foreground" />; })()}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Browse available icons at{' '}
                <a href="https://lucide.dev/icons/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                  lucide.dev/icons
                </a>
                . Use the icon name in kebab-case (e.g. <code className="text-xs">box</code>, <code className="text-xs">file-box</code>).
              </p>
              {!iconExists(newCategoryIcon) && (
                <p className="text-xs text-destructive">Icon not found — will fall back to the Folder icon.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              data-testid="cancel-add-button"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (newCategoryLabel.trim()) {
                  await onAddCategory(newCategoryLabel.trim(), newCategoryIcon);
                  setIsAddDialogOpen(false);
                  setNewCategoryLabel('');
                  setNewCategoryIcon('Folder');
                }
              }}
              data-testid="confirm-add-button"
              disabled={!newCategoryLabel.trim()}
            >
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
