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
import { ImageWithFallback } from "./ImageWithFallback";
import { triggerDownload, normalizeModelPath } from "../utils/downloadUtils";

interface ModelCardProps {
  model: Model;
  onClick: () => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (modelId: string) => void;
}

export function ModelCard({ 
  model, 
  onClick, 
  isSelectionMode = false,
  isSelected = false,
  onSelectionChange
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

  return (
    <Card className={`cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 ${
      isSelectionMode && isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
    }`} onClick={onClick}>
      <CardHeader className="p-0">
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg">
          <ImageWithFallback
            src={model.thumbnail}
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
          
          {/* Print Status - Top Right */}
          <div className="absolute top-3 right-3">
            {model.isPrinted ? (
              <Badge className="bg-green-700 hover:bg-green-600">
                <Check className="h-3 w-3 mr-1" />
                Printed
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" />
                Not Printed
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
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
          <div className="flex justify-between">
            <span>Print Time:</span>
            <span>{model.printTime}</span>
          </div>
          <div className="flex justify-between">
            <span>Filament:</span>
            <span>{model.filamentUsed}</span>
          </div>
        </div>
      </CardContent>
      
      {/* Only show footer actions when not in selection mode */}
      {!isSelectionMode && (
        <CardFooter className="p-4 pt-0">
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
 