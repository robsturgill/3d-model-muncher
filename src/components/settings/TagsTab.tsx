import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { Tag, Edit2, Trash2, Eye, Search, BarChart3, X } from "lucide-react";
import { Model } from "../../types/model";
import { useState, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";

interface TagInfo {
  name: string;
  count: number;
  models: Model[];
}

interface TagsTabProps {
  models: Model[];
  onRenameTag: (oldTag: string, newTag: string) => Promise<void>;
  onDeleteTag: (tag: string) => Promise<void>;
  onViewTagModels?: (tag: TagInfo) => void;
}

export function TagsTab({
  models,
  onRenameTag,
  onDeleteTag,
  onViewTagModels,
}: TagsTabProps) {
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<TagInfo | null>(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renameTagValue, setRenameTagValue] = useState('');
  const tagInputRef = useRef<HTMLInputElement | null>(null);

  const getAllTags = (): TagInfo[] => {
    const tagMap = new Map<string, TagInfo>();
    
    if (!models) return [];

    models.forEach(model => {
      if (!model || !Array.isArray(model.tags)) return;

      model.tags.forEach(tag => {
        if (!tag) return;

        if (tagMap.has(tag)) {
          const existingTag = tagMap.get(tag)!;
          existingTag.count++;
          existingTag.models.push(model);
        } else {
          tagMap.set(tag, {
            name: tag,
            count: 1,
            models: [model]
          });
        }
      });
    });

    const tags = Array.from(tagMap.values());
    return tags.sort((a, b) => b.count - a.count);
  };

  const allTags = getAllTags();

  const filteredTags = useMemo(() => {
    return allTags.filter(tag =>
      tag && tag.name ? tag.name.toLowerCase().includes((tagSearchTerm || '').toLowerCase()) : false
    );
  }, [allTags, tagSearchTerm]);

  const getTagStats = () => {
    const totalTags = allTags.length;
    const totalUsages = allTags.reduce((sum, tag) => sum + tag.count, 0);
    const avgUsage = totalTags > 0 ? (totalUsages / totalTags).toFixed(1) : '0';
    
    return { totalTags, totalUsages, avgUsage };
  };

  const stats = getTagStats();

  const startRenameTag = (tag: TagInfo) => {
    setSelectedTag(tag);
    setRenameTagValue(tag.name);
    setIsRenameDialogOpen(true);
  };

  return (
    <div data-testid="tags-tab">
      {/* Tag Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-semibold" data-testid="total-tags-count">{stats.totalTags}</p>
                <p className="text-sm text-muted-foreground">Total Tags</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-semibold" data-testid="total-usages-count">{stats.totalUsages}</p>
                <p className="text-sm text-muted-foreground">Total Usages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-semibold" data-testid="avg-usage-count">{stats.avgUsage}</p>
                <p className="text-sm text-muted-foreground">Avg per Tag</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tag Management */}
      <Card>
        <CardHeader>
          <CardTitle>Global Tag Management</CardTitle>
          <CardDescription>
            Manage tags across all your models. Rename or delete tags globally.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tags..."
                value={tagSearchTerm}
                onChange={(e) => setTagSearchTerm(e.target.value)}
                ref={tagInputRef}
                data-testid="tag-search-input"
                className="pl-10 pr-10"
              />
              {tagSearchTerm && (
                <button
                  type="button"
                  onClick={() => { setTagSearchTerm(''); tagInputRef.current?.focus(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                  data-testid="clear-tag-search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Tags List */}
          <ScrollArea className="max-h-96 w-full">
            <div className="space-y-2 p-2 max-h-80" data-testid="tags-list">
              {filteredTags.map((tag) => (
                <div key={tag.name} className="flex items-center justify-between p-3 bg-muted rounded-lg" data-testid={`tag-item-${tag.name}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <Badge variant="secondary" className="font-medium">
                      {tag.name}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Used in {tag.count} model{tag.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {onViewTagModels && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewTagModels(tag)}
                        aria-label={`View ${tag.name}`}
                        data-testid={`view-tag-${tag.name}`}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline">View</span>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startRenameTag(tag)}
                      aria-label={`Rename ${tag.name}`}
                      data-testid={`rename-tag-${tag.name}`}
                      className="gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Rename</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteTag(tag.name)}
                      aria-label={`Delete ${tag.name}`}
                      data-testid={`delete-tag-${tag.name}`}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent data-testid="rename-tag-dialog">
          <DialogHeader>
            <DialogTitle>Rename Tag</DialogTitle>
            <DialogDescription>
              This will rename the tag across all models that use it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rename-tag">New tag name</Label>
              <Input
                id="rename-tag"
                value={renameTagValue}
                onChange={(e) => setRenameTagValue(e.target.value)}
                placeholder="Enter new tag name"
                data-testid="rename-tag-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRenameDialogOpen(false)}
              data-testid="cancel-rename-tag-button"
            >
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                if (selectedTag && renameTagValue.trim()) {
                  await onRenameTag(selectedTag.name, renameTagValue);
                  setIsRenameDialogOpen(false);
                }
              }}
              disabled={!renameTagValue.trim() || renameTagValue === selectedTag?.name}
              data-testid="confirm-rename-tag-button"
            >
              Rename Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
