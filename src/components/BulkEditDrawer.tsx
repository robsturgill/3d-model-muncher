import { useState, useEffect } from "react";
import { Model } from "../types/model";
import { Category } from "../types/category";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "./ui/sheet";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Switch } from "./ui/switch";
import { Separator } from "./ui/separator";
import { Checkbox } from "./ui/checkbox";
import {
  Save,
  X,
  Users,
  Tag,
  Globe,
  StickyNote,
  FileText,
  CheckCircle,
  XCircle,
  DollarSign,
} from "lucide-react";

interface BulkEditDrawerProps {
  models: Model[];
  isOpen: boolean;
  onClose: () => void;
  onBulkUpdate: (updates: Partial<Model>) => void;
  categories: Category[];
}

interface BulkEditState {
  category?: string;
  license?: string;
  isPrinted?: boolean;
  tags?: {
    add: string[];
    remove: string[];
  };
  notes?: string;
  source?: string;
  price?: number;
}

interface FieldSelection {
  category: boolean;
  license: boolean;
  isPrinted: boolean;
  tags: boolean;
  notes: boolean;
  source: boolean;
  price: boolean;
}

export function BulkEditDrawer({
  models,
  isOpen,
  onClose,
  onBulkUpdate,
  categories,
}: BulkEditDrawerProps) {
  const [editState, setEditState] = useState<BulkEditState>({});
  const [fieldSelection, setFieldSelection] =
    useState<FieldSelection>({
      category: false,
      license: false,
      isPrinted: false,
      tags: false,
      notes: false,
      source: false,
      price: false,
    });
  const [newTag, setNewTag] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Available licenses
  const availableLicenses = [
    "Creative Commons - Attribution",
    "Creative Commons - Attribution-ShareAlike",
    "Creative Commons - Attribution-NonCommercial",
    "MIT License",
    "GNU GPL v3",
    "Apache License 2.0",
    "BSD 3-Clause License",
    "Public Domain",
  ];

  // Get common values across selected models
  const getCommonValues = () => {
    if (models.length === 0) return {};

    const firstModel = models[0];
    const common: any = {};

    // Check category
    if (
      models.every(
        (model) => model.category === firstModel.category,
      )
    ) {
      common.category = firstModel.category;
    }

    // Check license
    if (
      models.every(
        (model) => model.license === firstModel.license,
      )
    ) {
      common.license = firstModel.license;
    }

    // Check print status
    if (
      models.every(
        (model) => model.isPrinted === firstModel.isPrinted,
      )
    ) {
      common.isPrinted = firstModel.isPrinted;
    }

    return common;
  };

  const getAllTags = () => {
    const allTags = new Set<string>();
    models.forEach((model) => {
      model.tags.forEach((tag) => allTags.add(tag));
    });
    return Array.from(allTags).sort();
  };

  const commonValues = getCommonValues();
  const allTags = getAllTags();

  // Reset state when models change or drawer opens
  useEffect(() => {
    if (isOpen) {
      setEditState({
        tags: { add: [], remove: [] },
      });
      setFieldSelection({
        category: false,
        license: false,
        isPrinted: false,
        tags: false,
        notes: false,
        source: false,
        price: false,
      });
      setNewTag("");
    }
  }, [isOpen, models]);

  const handleFieldToggle = (field: keyof FieldSelection) => {
    setFieldSelection((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));

    // Clear the field value if unchecked
    if (fieldSelection[field]) {
      setEditState((prev) => {
        const newState = { ...prev };
        delete newState[field];
        return newState;
      });
    }
  };

  const handleCategoryChange = (value: string) => {
    setEditState((prev) => ({ ...prev, category: value }));
  };

  const handleLicenseChange = (value: string) => {
    setEditState((prev) => ({ ...prev, license: value }));
  };

  const handlePrintStatusChange = (checked: boolean) => {
    setEditState((prev) => ({ ...prev, isPrinted: checked }));
  };

  const handleNotesChange = (value: string) => {
    setEditState((prev) => ({ ...prev, notes: value }));
  };

  const handleSourceChange = (value: string) => {
    setEditState((prev) => ({ ...prev, source: value }));
  };

  const handlePriceChange = (value: string) => {
    setEditState((prev) => ({ 
      ...prev, 
      price: value ? parseFloat(value) : undefined 
    }));
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;

    const trimmedTag = newTag.trim();
    setEditState((prev) => ({
      ...prev,
      tags: {
        add: [...(prev.tags?.add || []), trimmedTag],
        remove: (prev.tags?.remove || []).filter(
          (tag) => tag !== trimmedTag,
        ),
      },
    }));
    setNewTag("");
  };

  const handleRemoveTagFromAdd = (tagToRemove: string) => {
    setEditState((prev) => ({
      ...prev,
      tags: {
        add: (prev.tags?.add || []).filter(
          (tag) => tag !== tagToRemove,
        ),
        remove: prev.tags?.remove || [],
      },
    }));
  };

  const handleToggleTagRemoval = (tag: string) => {
    setEditState((prev) => {
      const currentRemove = prev.tags?.remove || [];
      const isRemoving = currentRemove.includes(tag);

      return {
        ...prev,
        tags: {
          add: prev.tags?.add || [],
          remove: isRemoving
            ? currentRemove.filter((t) => t !== tag)
            : [...currentRemove, tag],
        },
      };
    });
  };

  // Helper to send only changed fields to backend
  const saveModelToFile = async (edited: Model, original: Model) => {
    if (!edited.filePath) {
      console.error("No filePath specified for model");
      return;
    }
    // Compute changed fields
    const changes: any = { filePath: edited.filePath, id: edited.id };
    Object.keys(edited).forEach(key => {
      if (key === 'filePath' || key === 'id') return;
      const editedValue = JSON.stringify((edited as any)[key]);
      const originalValue = JSON.stringify((original as any)[key]);
      if (editedValue !== originalValue) {
        changes[key] = (edited as any)[key];
      }
    });
    
    console.log(`[BulkEdit] Saving model ${edited.name} with changes:`, changes);
    
    try {
      const response = await fetch('http://localhost:3001/api/save-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes)
      });
      const result = await response.json();
      console.log(`[BulkEdit] Save result for ${edited.name}:`, result);
      if (!result.success) {
        throw new Error(result.error || 'Failed to save model');
      }
    } catch (err) {
      console.error(`[BulkEdit] Failed to save model ${edited.name} to file:`, err);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const updates: Partial<Model> = {};

      // Apply selected fields
      if (fieldSelection.category && editState.category) {
        updates.category = editState.category;
      }

      if (fieldSelection.license && editState.license) {
        updates.license = editState.license;
      }

      if (
        fieldSelection.isPrinted &&
        editState.isPrinted !== undefined
      ) {
        updates.isPrinted = editState.isPrinted;
      }

      if (fieldSelection.notes && editState.notes !== undefined) {
        updates.notes = editState.notes;
      }

      if (
        fieldSelection.source &&
        editState.source !== undefined
      ) {
        updates.source = editState.source;
      }

      if (
        fieldSelection.price &&
        editState.price !== undefined
      ) {
        updates.price = editState.price;
      }

      // Handle tags separately since it requires special logic
      if (fieldSelection.tags && editState.tags) {
        // This will be handled in the parent component
        (updates as any).bulkTagChanges = editState.tags;
      }

      // Update UI state
      onBulkUpdate(updates);

      // Save each model to its respective file
      console.log(`[BulkEdit] Processing ${models.length} models for bulk save`);
      
      for (const model of models) {
        // Ensure filePath is present for saving
        let filePath = model.filePath;
        if (!filePath) {
          // Construct the path based on the modelUrl to match the actual JSON file location
          if (model.modelUrl) {
            // Convert from /models/path/file.3mf to models/path/file-munchie.json
            let relativePath = model.modelUrl.replace('/models/', '');
            // Replace .3mf extension with -munchie.json
            if (relativePath.endsWith('.3mf')) {
              relativePath = relativePath.replace('.3mf', '-munchie.json');
            } else {
              relativePath = `${relativePath}-munchie.json`;
            }
            filePath = `models/${relativePath}`;
          } else {
            // Fallback to using the model name
            filePath = `models/${model.name}-munchie.json`;
          }
        }

        console.log(`[BulkEdit] Processing model: ${model.name}, filePath: ${filePath}`);
        console.log(`[BulkEdit] Model details:`, { id: model.id, name: model.name, modelUrl: model.modelUrl, category: model.category });

        // Create updated model with changes applied
        const updatedModel = { ...model, filePath };
        
        // Apply bulk tag changes if selected
        if (fieldSelection.tags && editState.tags) {
          let newTags = [...model.tags];
          
          // Remove tags
          if (editState.tags?.remove) {
            newTags = newTags.filter(tag => !editState.tags?.remove?.includes(tag));
          }
          
          // Add new tags
          if (editState.tags?.add) {
            editState.tags.add.forEach(tag => {
              if (!newTags.includes(tag)) {
                newTags.push(tag);
              }
            });
          }
          
          updatedModel.tags = newTags;
        }

        // Apply other field updates
        Object.keys(updates).forEach(key => {
          if (key !== 'bulkTagChanges') {
            (updatedModel as any)[key] = (updates as any)[key];
          }
        });

        // Save to file
        await saveModelToFile(updatedModel, model);
      }

      // Close the drawer after successful save
      onClose();
    } catch (error) {
      console.error('Failed to save bulk changes:', error);
      // You might want to show a toast notification here
    } finally {
      setIsSaving(false);
    }
  };



  const hasChanges = Object.values(fieldSelection).some(
    (selected) => selected,
  );

  if (models.length === 0) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-4 pb-6 border-b border-border">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1 min-w-0">
              <SheetTitle className="text-2xl font-semibold text-card-foreground flex items-center gap-2">
                <Users className="h-6 w-6" />
                Bulk Edit Models
              </SheetTitle>
              <SheetDescription className="text-muted-foreground">
                Editing {models.length} selected models. Only
                check the fields you want to update.
              </SheetDescription>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                size="sm"
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="p-6 space-y-8">
          {/* Selected Models Preview */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-card-foreground">
              Selected Models
            </h3>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
              {models.slice(0, 10).map((model) => (
                <Badge
                  key={model.id}
                  variant="secondary"
                  className="text-xs"
                >
                  {model.name}
                </Badge>
              ))}
              {models.length > 10 && (
                <Badge variant="secondary" className="text-xs">
                  +{models.length - 10} more
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Category Field */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="category-field"
                checked={fieldSelection.category}
                onCheckedChange={() =>
                  handleFieldToggle("category")
                }
              />
              <Label
                htmlFor="category-field"
                className="font-medium"
              >
                Update Category
              </Label>
            </div>

            {fieldSelection.category && (
              <div className="ml-6 space-y-2">
                <Select
                  value={editState.category || ""}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select new category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem
                        key={category.id}
                        value={category.label}
                      >
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {commonValues.category && (
                  <p className="text-xs text-muted-foreground">
                    Current: {commonValues.category}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* License Field */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="license-field"
                checked={fieldSelection.license}
                onCheckedChange={() =>
                  handleFieldToggle("license")
                }
              />
              <Label
                htmlFor="license-field"
                className="font-medium flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Update License
              </Label>
            </div>

            {fieldSelection.license && (
              <div className="ml-6 space-y-2">
                <Select
                  value={editState.license || ""}
                  onValueChange={handleLicenseChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select new license" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLicenses.map((license) => (
                      <SelectItem key={license} value={license}>
                        {license}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {commonValues.license && (
                  <p className="text-xs text-muted-foreground">
                    Current: {commonValues.license}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Print Status Field */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="print-status-field"
                checked={fieldSelection.isPrinted}
                onCheckedChange={() =>
                  handleFieldToggle("isPrinted")
                }
              />
              <Label
                htmlFor="print-status-field"
                className="font-medium"
              >
                Update Print Status
              </Label>
            </div>

            {fieldSelection.isPrinted && (
              <div className="ml-6 space-y-2">
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={editState.isPrinted || false}
                    onCheckedChange={handlePrintStatusChange}
                    id="bulk-printed"
                  />
                  <Label
                    htmlFor="bulk-printed"
                    className="flex items-center gap-2"
                  >
                    {editState.isPrinted ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    Mark as{" "}
                    {editState.isPrinted
                      ? "Printed"
                      : "Not Printed"}
                  </Label>
                </div>
                {commonValues.isPrinted !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    Currently:{" "}
                    {commonValues.isPrinted
                      ? "Printed"
                      : "Not Printed"}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Tags Field */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="tags-field"
                checked={fieldSelection.tags}
                onCheckedChange={() =>
                  handleFieldToggle("tags")
                }
              />
              <Label
                htmlFor="tags-field"
                className="font-medium flex items-center gap-2"
              >
                <Tag className="h-4 w-4" />
                Update Tags
              </Label>
            </div>

            {fieldSelection.tags && (
              <div className="ml-6 space-y-4">
                {/* Add New Tags */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Add Tags
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a tag..."
                      value={newTag}
                      onChange={(e) =>
                        setNewTag(e.target.value)
                      }
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={handleAddTag}
                      disabled={!newTag.trim()}
                      size="sm"
                    >
                      Add
                    </Button>
                  </div>

                  {/* Tags to Add */}
                  {editState.tags?.add &&
                    editState.tags.add.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Tags to add:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {editState.tags.add.map((tag) => (
                            <Badge
                              key={tag}
                              variant="default"
                              className="text-sm gap-1 cursor-pointer hover:bg-primary/80"
                              onClick={() =>
                                handleRemoveTagFromAdd(tag)
                              }
                            >
                              {tag}
                              <X className="h-3 w-3" />
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                </div>

                {/* Remove Existing Tags */}
                {allTags.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Remove Existing Tags
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Click on tags to toggle removal across all
                      selected models
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {allTags.map((tag) => {
                        const isRemoving =
                          editState.tags?.remove?.includes(tag);
                        return (
                          <Badge
                            key={tag}
                            variant={
                              isRemoving
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-sm cursor-pointer transition-colors"
                            onClick={() =>
                              handleToggleTagRemoval(tag)
                            }
                          >
                            {tag}
                            {isRemoving && (
                              <X className="h-3 w-3 ml-1" />
                            )}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes Field */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="notes-field"
                checked={fieldSelection.notes}
                onCheckedChange={() =>
                  handleFieldToggle("notes")
                }
              />
              <Label
                htmlFor="notes-field"
                className="font-medium flex items-center gap-2"
              >
                <StickyNote className="h-4 w-4" />
                Update Notes
              </Label>
            </div>

            {fieldSelection.notes && (
              <div className="ml-6 space-y-2">
                <Textarea
                  placeholder="Add notes for all selected models..."
                  value={editState.notes || ""}
                  onChange={(e) =>
                    handleNotesChange(e.target.value)
                  }
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  These notes will replace existing notes for
                  all selected models
                </p>
              </div>
            )}
          </div>

          {/* Source Field */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="source-field"
                checked={fieldSelection.source}
                onCheckedChange={() =>
                  handleFieldToggle("source")
                }
              />
              <Label
                htmlFor="source-field"
                className="font-medium flex items-center gap-2"
              >
                <Globe className="h-4 w-4" />
                Update Source URL
              </Label>
            </div>

            {fieldSelection.source && (
              <div className="ml-6 space-y-2">
                <Input
                  type="url"
                  placeholder="https://www.thingiverse.com/thing/123456"
                  value={editState.source || ""}
                  onChange={(e) =>
                    handleSourceChange(e.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  This URL will be set for all selected models
                </p>
              </div>
            )}
          </div>

          {/* Price Field */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="price-field"
                checked={fieldSelection.price}
                onCheckedChange={() =>
                  handleFieldToggle("price")
                }
              />
              <Label
                htmlFor="price-field"
                className="font-medium flex items-center gap-2"
              >
                <DollarSign className="h-4 w-4" />
                Update Selling Price
              </Label>
            </div>

            {fieldSelection.price && (
              <div className="ml-6 space-y-2">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={editState.price || ""}
                    onChange={(e) =>
                      handlePriceChange(e.target.value)
                    }
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  This price will be set for all selected models
                </p>
              </div>
            )}
          </div>

          {/* Bottom Action Bar */}
          <div className="flex items-center justify-between pt-6 border-t border-border bg-muted/30 -mx-6 px-6 py-4 mt-8 rounded-lg">
            <p className="text-sm text-muted-foreground">
              {hasChanges
                ? "Ready to update"
                : "Select fields to update"}{" "}
              {models.length} models
            </p>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Apply Changes'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}