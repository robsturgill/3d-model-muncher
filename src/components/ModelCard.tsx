import * as React from "react";
import { Check, Clock, Download, ChevronDown } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./ui/dropdown-menu";
import { Checkbox } from "./ui/checkbox";
import { Model } from "../types/model";
import { ConfigManager } from "../utils/configManager";
import { getLabel } from "../constants/labels";
import type { AppConfig } from "../types/config";
import { ImageWithFallback } from "./ImageWithFallback";
import { triggerDownload, normalizeModelPath } from "../utils/downloadUtils";

interface ModelCardProps {
  model: Model;
  onClick: () => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (modelId: string) => void;
  // Optional config passed from parent for live updates
  config?: AppConfig;
}

export function ModelCard({ 
  model, 
  onClick, 
  isSelectionMode = false,
  isSelected = false,
  onSelectionChange
  , config
}: ModelCardProps) {
  
  const handleSelectionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelectionChange) {
      onSelectionChange(model.id);
    }
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Use shared triggerDownload which normalizes paths and triggers the browser download
    triggerDownload(model.modelUrl, e.nativeEvent);
  };

  const downloadUrl = (url: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    // reuse normalization helper when building menu items' download links
    const resolved = normalizeModelPath(url);
    if (!resolved) return;
    const fileName = resolved.split('/').pop() || '';
    const link = document.createElement('a');
    link.href = resolved;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to extract user image data
  const getUserImageData = (entry: any) => {
    if (!entry) return '';
    if (typeof entry === 'string') return entry;
    if (typeof entry === 'object' && typeof entry.data === 'string') return entry.data;
    return '';
  };

  // Resolve thumbnail descriptor to actual image URL
  const resolveThumbnail = () => {
  const thumbnailDesc = (model as any).userDefined?.thumbnail;
    
    if (thumbnailDesc && typeof thumbnailDesc === 'string') {
      // Handle descriptor format (parsed:0, user:1, etc.)
      if (thumbnailDesc.startsWith('parsed:')) {
        const idx = parseInt(thumbnailDesc.split(':')[1] || '', 10);
        if (!isNaN(idx)) {
          // Try new parsedImages structure first
          if (Array.isArray(model.parsedImages) && model.parsedImages[idx]) {
            return model.parsedImages[idx];
          }
          // Fall back to legacy structure
          if (idx === 0 && model.thumbnail) return model.thumbnail;
          if (Array.isArray(model.images) && model.images[idx - 1]) {
            return model.images[idx - 1];
          }
        }
      } else if (thumbnailDesc.startsWith('user:')) {
        const idx = parseInt(thumbnailDesc.split(':')[1] || '', 10);
  const userImages = (model as any).userDefined?.images;
        if (!isNaN(idx) && Array.isArray(userImages) && userImages[idx]) {
          return getUserImageData(userImages[idx]);
        }
      } else {
        // Legacy: treat as literal data URL
        return thumbnailDesc;
      }
    }
    
    // Fallback to model.thumbnail for backward compatibility
    return model.thumbnail || '';
  };

  const thumbnailSrc = resolveThumbnail();

  return (
    <Card className={`flex flex-col cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 ${
      isSelectionMode && isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
    }`} onClick={onClick}>
      <CardHeader className="p-0">
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg">
          <ImageWithFallback
            src={thumbnailSrc}
            alt={model.name}
            className="w-full h-full object-cover"
          />
          
          {/* Selection Checkbox - Top Left */}
          {isSelectionMode && (
            <div className="absolute top-3 left-3">
              <div className="flex items-center justify-center w-8 h-8 bg-background/90 backdrop-blur-sm rounded-lg border shadow-sm">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onSelectionChange?.(model.id)}
                  onClick={handleSelectionClick}
                  className="w-5 h-5 shrink-0"
                />
              </div>
            </div>
          )}
          
          {/* Hidden Badge - Top Left (when not in selection mode) */}
          {!isSelectionMode && model.hidden && (
            <div className="absolute top-3 left-3">
              <Badge variant="outline" className="text-xs bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300 shadow-sm">
                Hidden
              </Badge>
            </div>
          )}
          
          {/* Hidden Badge - Bottom Left (when in selection mode) */}
          {isSelectionMode && model.hidden && (
            <div className="absolute bottom-3 left-3">
              <Badge variant="outline" className="text-xs bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300 shadow-sm">
                Hidden
              </Badge>
            </div>
          )}
          
          {/* Print Status - Top Right (toggleable via config.showPrintedBadge) */}
          {(() => {
            // Prefer passed-in config for live updates, otherwise load persisted config
            const effectiveCfg = config || ConfigManager.loadConfig();
            const showPrintedBadge = effectiveCfg?.settings?.showPrintedBadge !== false; // default true

            // Always show the Not Printed badge when the model has not been printed.
            if (!model.isPrinted) {
              return (
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    Not Printed
                  </Badge>
                </div>
              );
            }

            // If model is printed, only show the Printed badge when enabled in settings
            if (model.isPrinted && showPrintedBadge) {
              return (
                <div className="absolute top-3 right-3">
                  <Badge className="bg-green-700 hover:bg-green-600">
                    <Check className="h-3 w-3 mr-1" />
                    Printed
                  </Badge>
                </div>
              );
            }

            return null;
          })()}
        </div>
      </CardHeader>
      
      <CardContent className="p-4 flex-1">
        <h3 className={`mb-2 line-clamp-2 transition-colors ${
          isSelectionMode && isSelected ? 'text-primary font-medium' : ''
        }`}>
          {model.name}
        </h3>
        <div className="flex flex-wrap gap-1 mb-3">
          {(model.tags || []).slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {(model.tags || []).length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{(model.tags || []).length - 3}
            </Badge>
          )}
        </div>
        <div className="text-muted-foreground space-y-1">
          {(() => {
            // Prefer config passed in as prop for live updates, otherwise read persisted config
            const cfg = (arguments.length > 0 && (arguments as any)[0]?.config) || undefined;
            const effectiveCfg = cfg || ConfigManager.loadConfig();
            const primary = effectiveCfg?.settings?.modelCardPrimary || 'printTime';
            const secondary = effectiveCfg?.settings?.modelCardSecondary || 'filamentUsed';

            const fieldValue = (key: string) => {
              switch (key) {
                case 'printTime': return model.printTime || '';
                case 'filamentUsed': return model.filamentUsed || '';
                case 'fileSize': return model.fileSize || '';
                case 'category': return model.category || '';
                case 'designer': return (model as any).designer || '';
                case 'layerHeight': return model.printSettings?.layerHeight || '';
                case 'nozzle': return model.printSettings?.nozzle || '';
                case 'price': return typeof model.price === 'number' ? `$${model.price.toFixed(2)}` : (model.price ? String(model.price) : '');
                default: return '';
              }
            };

            const labelForKey = (key: string) => getLabel(key) + ':';

            const rows: Array<{ label: string; value: string }> = [];
            if (primary && primary !== 'none') {
              rows.push({ label: labelForKey(primary), value: fieldValue(primary) });
            }
            if (secondary && secondary !== 'none' && secondary !== primary) {
              rows.push({ label: labelForKey(secondary), value: fieldValue(secondary) });
            }

            if (rows.length === 0) return null;

            return rows.map((r, i) => (
              <div className="flex justify-between" key={i}>
                <span>{r.label}</span>
                <span>{r.value}</span>
              </div>
            ));
          })()}
        </div>
      </CardContent>
      
      {/* Only show footer actions when not in selection mode */}
      {!isSelectionMode && (
        // Keep footer at the bottom of the flex column
        <CardFooter className="p-4 pt-0 mt-auto">
          {/* Split button: primary left downloads main model file, right shows related files menu (if any) */}
          <div className="w-full relative">
            <div className="flex w-full">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 flex items-center justify-center"
                onClick={handleDownloadClick}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>

              {/* Related files trigger - only render if related_files exists and has length */}
              {(model as any).related_files && (model as any).related_files.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      className="ml-2 w-9"
                      aria-label="Related files"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {((model as any).related_files || []).map((f: any, i: number) => {
                      const item = typeof f === 'string' ? { name: f.split('/').pop() || f, url: f } : { name: f.name || (f.url || '').split('/').pop() || 'file', url: f.url || f.path || '' };
                      return (
                        <DropdownMenuItem key={i} onClick={(e: any) => downloadUrl(item.url, e)}>
                          {item.name}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
 