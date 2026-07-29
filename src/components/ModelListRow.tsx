import type { MouseEvent } from "react";
import { Model } from "../types/model";
import { AppConfig } from "../types/config";
import { ImageWithFallback } from "./ImageWithFallback";
import { resolveModelThumbnail } from "../utils/thumbnailUtils";
import { ConfigManager } from "../utils/configManager";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { Clock, Weight, HardDrive } from "lucide-react";

interface ModelListRowProps {
  model: Model;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onClick: (event: MouseEvent) => void;
  onCheckboxClick: (event: MouseEvent<HTMLButtonElement>) => void;
  config?: AppConfig | null;
  /**
   * Denser variant used inside a collection group, where every row is a variant
   * of the same model: the shared description and tags are noise, so only the
   * details that actually differ between variants are shown.
   */
  compact?: boolean;
}

export function ModelListRow({
  model,
  isSelectionMode = false,
  isSelected = false,
  onClick,
  onCheckboxClick,
  config,
  compact = false,
}: ModelListRowProps) {
  const effectiveCfg = config ?? ConfigManager.loadConfig();
  const showPrintedBadge = effectiveCfg?.settings?.showPrintedBadge !== false;

  return (
    <div
      data-testid={`row-${model.id}`}
      onClick={onClick}
      onMouseDown={(event) => {
        // Prevent text selection when Shift-clicking in selection mode
        if (isSelectionMode && event.shiftKey) event.preventDefault();
      }}
      className={`flex items-center bg-card rounded-lg border hover:bg-accent/50 hover:border-primary/30 cursor-pointer transition-all duration-200 group shadow-sm hover:shadow-md ${
        compact ? 'gap-3 p-2.5' : 'gap-4 p-4'
      } ${isSelectionMode && isSelected ? 'border-primary bg-primary/5' : ''}`}
    >
      {/* Selection Checkbox - Only show in selection mode */}
      {isSelectionMode && (
        <div className="flex-shrink-0 pl-1">
          <Checkbox
            checked={isSelected}
            // handle clicks to capture shiftKey; avoid double firing on change
            onCheckedChange={() => { /* handled by click */ }}
            onClick={onCheckboxClick}
            data-testid={`checkbox-${model.id}`}
            className="w-5 h-5"
          />
        </div>
      )}

      {/* Thumbnail */}
      <div className="flex-shrink-0">
        <div className="relative">
          <ImageWithFallback
            src={resolveModelThumbnail(model)}
            alt={model.name}
            className={`object-cover rounded-lg border group-hover:border-primary/30 transition-colors ${
              compact ? 'w-14 h-14' : 'w-20 h-20'
            } ${isSelectionMode && isSelected ? 'border-primary' : ''}`}
          />
          {/* Print status overlay (hideable via config.showPrintedBadge) */}
          {!model.isPrinted && (
            <div className="absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-card bg-yellow-500" />
          )}
          {model.isPrinted && showPrintedBadge && (
            <div className="absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-card bg-green-700" />
          )}
        </div>
      </div>

      {/* Model Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3
              className={`font-semibold group-hover:text-primary transition-colors truncate ${
                compact ? 'text-base' : 'text-lg'
              } ${isSelectionMode && isSelected ? 'text-primary' : 'text-card-foreground'}`}
            >
              {model.name}
            </h3>

            {!compact && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                {model.description}
              </p>
            )}

            {/* Category */}
            <div className={`flex flex-wrap gap-2 ${compact ? 'mt-1' : 'mt-2'}`}>
              <Badge variant="outline" className="text-xs font-medium">
                {model.category}
              </Badge>
              {model.hidden && (
                <Badge variant="outline" className="text-xs bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300">
                  Hidden
                </Badge>
              )}
            </div>

            {/* Tags */}
            {!compact && (
              <div className="flex flex-wrap gap-1 mt-2">
                {(model.tags || []).slice(0, 4).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {(model.tags || []).length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{(model.tags || []).length - 4}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Status and Stats */}
          <div className={`flex flex-col items-end ml-6 ${compact ? 'gap-1.5' : 'gap-3'}`}>
            {showPrintedBadge && !compact && (
              <Badge variant={model.isPrinted ? "default" : "secondary"} className="font-medium">
                {model.isPrinted ? "✓ Printed" : "○ Not Printed"}
              </Badge>
            )}

            <div className={`text-xs text-muted-foreground text-right ${compact ? 'flex items-center gap-3' : 'space-y-1'}`}>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{model.printTime}</span>
              </div>
              <div className="flex items-center gap-1">
                <Weight className="h-3 w-3" />
                <span>{model.filamentUsed}</span>
              </div>
              <div className="flex items-center gap-1">
                <HardDrive className="h-3 w-3" />
                <span>{model.fileSize}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
