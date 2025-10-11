import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { CheckSquare, Square, Edit, Trash2, X, List } from "lucide-react";

interface SelectionModeControlsProps {
  isSelectionMode: boolean;
  selectedCount: number;
  onEnterSelectionMode?: () => void;
  onExitSelectionMode?: () => void;
  onBulkEdit?: () => void | Promise<void>;
  onCreateCollection?: () => void;
  onBulkDelete?: () => void | Promise<void>;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  className?: string;
  selectLabel?: string;
  exitLabel?: string;
}

export function SelectionModeControls({
  isSelectionMode,
  selectedCount,
  onEnterSelectionMode,
  onExitSelectionMode,
  onBulkEdit,
  onCreateCollection,
  onBulkDelete,
  onSelectAll,
  onDeselectAll,
  className,
  selectLabel = "Select",
  exitLabel = "Done",
}: SelectionModeControlsProps) {
  const containerClass = ["flex items-center gap-2", className].filter(Boolean).join(" ");
  const hasBulkSelection = selectedCount > 0;

  if (!isSelectionMode) {
    return (
      <div className={containerClass}>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEnterSelectionMode}
          className="gap-2"
          title="Enter selection mode"
          disabled={!onEnterSelectionMode}
        >
          <CheckSquare className="h-4 w-4" />
          <span className="hidden sm:inline">{selectLabel}</span>
        </Button>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <Badge variant="secondary" className="gap-1">
        {selectedCount} selected
      </Badge>

      {hasBulkSelection && (
        <>
          {onBulkEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBulkEdit}
              className="gap-2"
              title="Bulk edit selected models"
            >
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
          )}

          {onCreateCollection && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCreateCollection}
              className="gap-2"
              title="Create collection from selection"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Collection</span>
            </Button>
          )}

          {onBulkDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBulkDelete}
              className="gap-2 text-destructive hover:text-destructive"
              title="Delete selected models"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          )}
        </>
      )}

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSelectAll}
          title="Select all visible models"
          disabled={!onSelectAll}
        >
          <CheckSquare className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onDeselectAll}
          title="Deselect all models"
          disabled={!onDeselectAll}
        >
          <Square className="h-4 w-4" />
        </Button>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onExitSelectionMode}
        className="gap-2"
        title="Exit selection mode"
        disabled={!onExitSelectionMode}
      >
        <X className="h-4 w-4" />
        <span className="hidden sm:inline">{exitLabel}</span>
      </Button>
    </div>
  );
}