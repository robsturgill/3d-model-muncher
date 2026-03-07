import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { GripVertical, Edit2, Plus, Save, X } from "lucide-react";
import { Category } from "../../types/category";
import { Model } from "../../types/model";
import { useState } from "react";
import * as LucideIcons from 'lucide-react';

interface CategoriesTabProps {
  categories: Category[];
  models: Model[];
  onCategoriesUpdate: (categories: Category[]) => void;
  onSaveCategories: () => void;
  onRenameCategory: (oldId: string, newId: string, newLabel: string) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
  onAddCategory: (label: string, icon: string) => Promise<void>;
}

export function CategoriesTab({
  categories,
  models,
  onCategoriesUpdate,
  onSaveCategories,
  onRenameCategory,
  onDeleteCategory,
  onAddCategory,
}: CategoriesTabProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [renameCategoryValue, setRenameCategoryValue] = useState('');
  const [renameCategoryIcon, setRenameCategoryIcon] = useState('Folder');
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('Folder');

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
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>
            Drag and drop to reorder categories. Click edit to rename categories and update all associated models.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2" data-testid="categories-list">
            {categories.map((category, index) => {
              const IconComp = getLucideIconComponent(category.icon);
              const modelCount = models.filter(m => m.category === category.label).length;
              
              return (
                <div
                  key={category.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  data-testid={`category-item-${category.id}`}
                  className={`
                    flex items-center gap-3 p-3 bg-muted rounded-lg border border-border
                    cursor-move hover:bg-accent/50 transition-colors duration-200
                    ${draggedIndex === index ? 'opacity-50' : ''}
                  `}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
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
              <Input
                id="rename-category-icon"
                data-testid="rename-category-icon-input"
                value={renameCategoryIcon}
                onChange={(e) => setRenameCategoryIcon(e.target.value)}
                placeholder="e.g. tag, box, heart"
              />
            </div>
          </div>
          <DialogFooter>
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
                  await onRenameCategory(selectedCategory.id, newId, renameCategoryValue.trim());
                  setIsRenameDialogOpen(false);
                }
              }}
              data-testid="confirm-rename-button"
              disabled={!renameCategoryValue.trim()}
            >
              Rename Category
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
              <Input
                id="new-category-icon"
                data-testid="new-category-icon-input"
                value={newCategoryIcon}
                onChange={(e) => setNewCategoryIcon(e.target.value)}
                placeholder="e.g. tag, box, heart"
              />
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
