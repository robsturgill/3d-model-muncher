import { useState, KeyboardEvent, useEffect } from "react";
import { Model } from "../types/model";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";
import { Separator } from "./ui/separator";
import { AspectRatio } from "./ui/aspect-ratio";
import { ModelViewer3D } from "./ModelViewer3D";
import { ModelViewerErrorBoundary } from "./ErrorBoundary";
import { Clock, Weight, HardDrive, Layers, Droplet, Shield, Edit3, Save, X, FileText, Plus, Tag, Box, Images, ChevronLeft, ChevronRight, Maximize2, StickyNote, ExternalLink, Globe, DollarSign } from "lucide-react";

interface ModelDetailsDrawerProps {
  model: Model | null;
  isOpen: boolean;
  onClose: () => void;
  onModelUpdate: (model: Model) => void;
  defaultModelView?: '3d' | 'images';
}

// Suggested tags for each category
const CATEGORY_TAGS: Record<string, string[]> = {
  Miniatures: ["Miniature", "Fantasy", "Sci-Fi", "Dragon", "Warrior", "Monster", "D&D", "Tabletop"],
  Utility: ["Organizer", "Tool", "Stand", "Holder", "Clip", "Mount", "Storage", "Functional"],
  Decorative: ["Vase", "Ornament", "Art", "Display", "Sculpture", "Modern", "Elegant", "Beautiful"],
  Games: ["Chess", "Dice", "Board Game", "Puzzle", "Token", "Counter", "Gaming", "Entertainment"],
  Props: ["Cosplay", "Weapon", "Armor", "Helmet", "Shield", "Fantasy", "Replica", "Convention"]
};

export function ModelDetailsDrawer({
  model,
  isOpen,
  onClose,
  onModelUpdate,
  defaultModelView = 'images'
}: ModelDetailsDrawerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedModel, setEditedModel] = useState<Model | null>(null);
  const [newTag, setNewTag] = useState("");
  const [viewMode, setViewMode] = useState<'3d' | 'images'>(defaultModelView);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Reset view mode to default when drawer opens or when defaultModelView changes
  useEffect(() => {
    if (isOpen) {
      setViewMode(defaultModelView);
      setSelectedImageIndex(0);
    }
  }, [isOpen, defaultModelView]);

  if (!model) return null;

  // Combine thumbnail with additional images for gallery view
  const safeImages = Array.isArray(model.images) ? model.images : [];
  const allImages = [model.thumbnail, ...safeImages];
  const currentModel = editedModel || model;
  // Defensive: ensure printSettings is always an object with string fields
  const safePrintSettings = {
    layerHeight: currentModel.printSettings?.layerHeight || '',
    infill: currentModel.printSettings?.infill || '',
    supports: currentModel.printSettings?.supports || ''
  };

  const startEditing = () => {
    setEditedModel({ ...model });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditedModel(null);
    setIsEditing(false);
    setNewTag("");
  };

  const saveChanges = () => {
    if (editedModel) {
      onModelUpdate(editedModel);
      setIsEditing(false);
      setEditedModel(null);
      setNewTag("");
    }
  };

  const handleAddTag = () => {
    if (!newTag.trim() || !editedModel) return;
    
    const trimmedTag = newTag.trim();
    if (!editedModel.tags.includes(trimmedTag)) {
      setEditedModel({
        ...editedModel,
        tags: [...editedModel.tags, trimmedTag]
      });
    }
    setNewTag("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!editedModel) return;
    
    setEditedModel({
      ...editedModel,
      tags: editedModel.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleTagKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const getSuggestedTags = () => {
    if (!editedModel || !editedModel.category) return [];
    
    const suggestedTags = CATEGORY_TAGS[editedModel.category] || [];
    return suggestedTags.filter(tag => !editedModel.tags.includes(tag));
  };

  const handleSuggestedTagClick = (tag: string) => {
    if (!editedModel) return;
    
    setEditedModel({
      ...editedModel,
      tags: [...editedModel.tags, tag]
    });
  };

  const handleNextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const handlePreviousImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {/* Sticky Header during editing */}
        <SheetHeader className={`space-y-4 pb-6 border-b border-border bg-background/95 backdrop-blur-sm ${isEditing ? 'sticky top-0 z-10 shadow-sm' : ''}`}>
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1 min-w-0">
              <SheetTitle className="text-2xl font-semibold text-card-foreground pr-4">
                {currentModel.name}
              </SheetTitle>
              <SheetDescription className="text-muted-foreground">
                {currentModel.category} • {currentModel.isPrinted ? 'Printed' : 'Not Printed'}
              </SheetDescription>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              {isEditing ? (
                <>
                  <Button onClick={saveChanges} size="sm" className="gap-2">
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                  <Button onClick={cancelEditing} variant="outline" size="sm">
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button onClick={startEditing} variant="outline" size="sm" className="gap-2">
                  <Edit3 className="h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="p-6 space-y-8">
          {/* Model Viewer with Toggle */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg text-card-foreground">Model Preview</h3>
              
              {/* View Mode Toggle */}
              <div className="flex items-center bg-muted/30 rounded-lg p-1 border">
                <Button
                  variant={viewMode === '3d' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('3d')}
                  className="gap-2 h-8 px-3"
                >
                  <Box className="h-4 w-4" />
                  3D Model
                </Button>
                <Button
                  variant={viewMode === 'images' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('images')}
                  className="gap-2 h-8 px-3"
                >
                  <Images className="h-4 w-4" />
                  Images ({allImages.length})
                </Button>
              </div>
            </div>

            <div className="relative bg-gradient-to-br from-muted/30 to-muted/60 rounded-xl border overflow-hidden">
              {viewMode === '3d' ? (
                <ModelViewerErrorBoundary>
                  <ModelViewer3D 
                    modelUrl={currentModel.modelUrl} 
                    modelName={currentModel.name}
                  />
                </ModelViewerErrorBoundary>
              ) : (
                <div className="relative">
                  {/* Main Image Display */}
                  <AspectRatio ratio={16 / 10} className="bg-muted">
                    <img
                      src={allImages[selectedImageIndex]}
                      alt={`${currentModel.name} - Image ${selectedImageIndex + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    
                    {/* Navigation Arrows */}
                    {allImages.length > 1 && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handlePreviousImage}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 p-0 bg-background/80 hover:bg-background/90 border shadow-lg"
                          aria-label="Previous image"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleNextImage}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 p-0 bg-background/80 hover:bg-background/90 border shadow-lg"
                          aria-label="Next image"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    
                    {/* Image Counter */}
                    <div className="absolute bottom-3 right-3 bg-background/80 backdrop-blur-sm rounded-lg px-2 py-1 text-sm font-medium border shadow-lg">
                      {selectedImageIndex + 1} / {allImages.length}
                    </div>
                    
                    {/* Fullscreen Button */}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute top-3 right-3 w-8 h-8 p-0 bg-background/80 hover:bg-background/90 border shadow-lg"
                      aria-label="View fullscreen"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </AspectRatio>
                  
                  {/* Thumbnail Strip */}
                  {allImages.length > 1 && (
                    <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                      {allImages.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImageIndex(index)}
                          className={`
                            relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200
                            ${index === selectedImageIndex 
                              ? 'border-primary shadow-lg scale-105' 
                              : 'border-border hover:border-primary/50 hover:scale-102'
                            }
                          `}
                        >
                          <img
                            src={image}
                            alt={`${currentModel.name} thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {index === 0 && (
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <Badge variant="secondary" className="text-xs px-1 py-0">
                                Main
                              </Badge>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Model Details */}
          <div className="space-y-6">
            <h3 className="font-semibold text-lg text-card-foreground">Details</h3>
            
            {isEditing ? (
              <div className="grid gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Model Name</Label>
                    <Input
                      id="edit-name"
                      value={editedModel?.name || ""}
                      onChange={(e) => setEditedModel(prev => prev ? { ...prev, name: e.target.value } : null)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-category">Category</Label>
                    <Select
                      value={editedModel?.category || ""}
                      onValueChange={(value) => setEditedModel(prev => prev ? { ...prev, category: value } : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Miniatures">Miniatures</SelectItem>
                        <SelectItem value="Utility">Utility</SelectItem>
                        <SelectItem value="Decorative">Decorative</SelectItem>
                        <SelectItem value="Games">Games</SelectItem>
                        <SelectItem value="Props">Props</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editedModel?.description || ""}
                    onChange={(e) => setEditedModel(prev => prev ? { ...prev, description: e.target.value } : null)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-license">License</Label>
                    <Select
                      value={editedModel?.license || ""}
                      onValueChange={(value) => setEditedModel(prev => prev ? { ...prev, license: value } : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Creative Commons - Attribution">Creative Commons - Attribution</SelectItem>
                        <SelectItem value="Creative Commons - Attribution-ShareAlike">Creative Commons - Attribution-ShareAlike</SelectItem>
                        <SelectItem value="Creative Commons - Attribution-NonCommercial">Creative Commons - Attribution-NonCommercial</SelectItem>
                        <SelectItem value="MIT License">MIT License</SelectItem>
                        <SelectItem value="GNU GPL v3">GNU GPL v3</SelectItem>
                        <SelectItem value="Apache License 2.0">Apache License 2.0</SelectItem>
                        <SelectItem value="BSD 3-Clause License">BSD 3-Clause License</SelectItem>
                        <SelectItem value="Public Domain">Public Domain</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-price">Selling Price</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="edit-price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={editedModel?.price || ""}
                        onChange={(e) => setEditedModel(prev => prev ? { ...prev, price: e.target.value ? parseFloat(e.target.value) : undefined } : null)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Switch
                    checked={editedModel?.isPrinted || false}
                    onCheckedChange={(checked) => setEditedModel(prev => prev ? { ...prev, isPrinted: checked } : null)}
                    id="edit-printed"
                  />
                  <Label htmlFor="edit-printed">Mark as printed</Label>
                </div>

                {/* Tags Editing Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <Label>Tags</Label>
                  </div>
                  
                  {/* Add New Tag */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a tag..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={handleTagKeyPress}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={handleAddTag}
                      disabled={!newTag.trim()}
                      size="sm"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>

                  {/* Current Tags */}
                  {editedModel && editedModel.tags.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Current tags:</p>
                      <div className="flex flex-wrap gap-2">
                        {editedModel.tags.map((tag, index) => (
                          <Badge
                            key={`${tag}-${index}`}
                            variant="secondary"
                            className="text-sm gap-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                            onClick={() => handleRemoveTag(tag)}
                          >
                            {tag}
                            <X className="h-3 w-3" />
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">Click on a tag to remove it</p>
                    </div>
                  )}

                  {/* Suggested Tags */}
                  {getSuggestedTags().length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Suggested tags for {currentModel.category}:</p>
                      <div className="flex flex-wrap gap-2">
                        {getSuggestedTags().map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-sm cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                            onClick={() => handleSuggestedTagClick(tag)}
                          >
                            + {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes Editing Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <StickyNote className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="edit-notes">Notes</Label>
                  </div>
                  <Textarea
                    id="edit-notes"
                    placeholder="Add your personal notes about this model..."
                    value={editedModel?.notes || ""}
                    onChange={(e) => setEditedModel(prev => prev ? { ...prev, notes: e.target.value } : null)}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use notes to track print settings, modifications, or reminders.
                  </p>
                </div>

                {/* Source Editing Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="edit-source">Source URL</Label>
                  </div>
                  <Input
                    id="edit-source"
                    type="url"
                    placeholder="https://www.thingiverse.com/thing/123456"
                    value={editedModel?.source || ""}
                    onChange={(e) => setEditedModel(prev => prev ? { ...prev, source: e.target.value } : null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Link to where you downloaded this model (Thingiverse, Printables, etc.)
                  </p>
                </div>

                {/* Bottom Action Buttons for Editing */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-border bg-muted/30 -mx-6 px-6 py-4 mt-8 rounded-lg">
                  <Button onClick={cancelEditing} variant="outline" className="gap-2">
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button onClick={saveChanges} className="gap-2">
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-muted-foreground text-base leading-relaxed">
                  {currentModel.description}
                </p>

                {/* License Information */}
                <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">License:</span>
                  <Badge variant="outline" className="font-medium">
                    {currentModel.license}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Print Time:</span>
                    <span className="font-medium text-foreground">{currentModel.printTime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Weight className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Filament:</span>
                    <span className="font-medium text-foreground">{currentModel.filamentUsed}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">File Size:</span>
                    <span className="font-medium text-foreground">{currentModel.fileSize}</span>
                  </div>
                  {currentModel.price !== undefined && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Price:</span>
                      <span className="font-medium text-foreground">${currentModel.price.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Print Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-card-foreground">Print Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-center justify-center w-10 h-10 bg-background rounded-lg border">
                  <Layers className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Layer Height</p>
                  <p className="font-semibold text-foreground">{safePrintSettings.layerHeight}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-center justify-center w-10 h-10 bg-background rounded-lg border">
                  <Droplet className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Infill</p>
                  <p className="font-semibold text-foreground">{safePrintSettings.infill}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-center justify-center w-10 h-10 bg-background rounded-lg border">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Supports</p>
                  <p className="font-semibold text-foreground">{safePrintSettings.supports}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Tags Display */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-card-foreground">Tags</h3>
            {Array.isArray(currentModel.tags) && currentModel.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {currentModel.tags.map((tag, index) => (
                  <Badge key={`${tag}-${index}`} variant="secondary" className="text-sm">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No tags added yet.</p>
            )}
          </div>

          {/* Pricing Section */}
          {currentModel.price !== undefined && (
            <>
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold text-lg text-card-foreground">Pricing</h3>
                </div>
                <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg border border-primary/20">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Selling Price</p>
                    <p className="text-2xl font-semibold text-primary">${currentModel.price.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Notes Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-lg text-card-foreground">Notes</h3>
            </div>
            {currentModel.notes ? (
              <div className="p-4 bg-muted/30 rounded-lg border">
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                  {currentModel.notes}
                </p>
              </div>
            ) : (
              <div className="p-4 bg-muted/20 rounded-lg border border-dashed">
                <p className="text-muted-foreground text-sm text-center">
                  No notes added yet. Click Edit to add your thoughts about this model.
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Source Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-lg text-card-foreground">Source</h3>
            </div>
            {currentModel.source ? (
              <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-center justify-center w-10 h-10 bg-background rounded-lg border">
                  <ExternalLink className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">Downloaded from:</p>
                  <a
                    href={currentModel.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:text-primary/80 transition-colors break-all"
                  >
                    {currentModel.source}
                  </a>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="shrink-0"
                >
                  <a
                    href={currentModel.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Visit
                  </a>
                </Button>
              </div>
            ) : (
              <div className="p-4 bg-muted/20 rounded-lg border border-dashed">
                <p className="text-muted-foreground text-sm text-center">
                  No source URL added yet. Click Edit to add where you found this model.
                </p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}