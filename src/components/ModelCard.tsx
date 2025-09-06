import { Check, Clock, Download } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Model } from "../types/model";
import { ImageWithFallback } from "./ImageWithFallback";

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
    // Determine the file path (assume .3mf for this example)
    // You may want to adjust this logic if you support multiple formats
    const fileName = model.name.endsWith('.3mf') ? model.name : `${model.name}.3mf`;
    const filePath = `/models/${fileName}`;
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = filePath;
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
          
          {/* Print Status - Top Right */}
          <div className="absolute top-3 right-3">
            {model.isPrinted ? (
              <Badge className="bg-green-500 hover:bg-green-600">
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
          {model.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {model.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{model.tags.length - 3}
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
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleDownloadClick}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}