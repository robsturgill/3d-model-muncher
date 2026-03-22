import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { FileCheck, RefreshCw, Files, AlertTriangle, Clock, Trash2 } from "lucide-react";
import { HashCheckResult, Model, DuplicateGroup } from "../../types/model";
import { Separator } from "../ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { resolveModelThumbnail } from "../../utils/thumbnailUtils";
import { ImageWithFallback } from "../ImageWithFallback";

interface IntegrityTabProps {
  models: Model[];
  hashCheckResult: HashCheckResult | null;
  isHashChecking: boolean;
  hashCheckProgress: number;
  generateResult: { skipped?: number; generated?: number; verified?: number; processed?: number } | null;
  isGeneratingJson: boolean;
  selectedFileTypes: { "3mf": boolean; "stl": boolean };
  onFileTypeChange: (fileType: "3mf" | "stl", checked: boolean) => void;
  onRunHashCheck: () => Promise<void>;
  onGenerateModelJson: () => Promise<void>;
  onRegenerate?: (model: any) => Promise<void>;
  onRemoveDuplicates: (group: DuplicateGroup, keepModelId: string) => Promise<boolean>;
  onModelClick?: (model: Model) => void;
}

export function IntegrityTab({
  models,
  hashCheckResult,
  isHashChecking,
  hashCheckProgress,
  generateResult,
  isGeneratingJson,
  selectedFileTypes,
  onFileTypeChange,
  onRunHashCheck,
  onGenerateModelJson,
  onRegenerate,
  onRemoveDuplicates,
  onModelClick,
}: IntegrityTabProps) {
  const getDisplayPath = (model: Model) => {
    if (model.modelUrl) {
      return model.modelUrl.replace(/^\/models\//, '');
    }
    return model.name || 'Unknown';
  };

  return (
    <div data-testid="integrity-tab">
      <Card>
        <CardHeader>
          <CardTitle>File Integrity Check</CardTitle>
          <CardDescription>
            Verify model files and manage metadata
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-start gap-4">
            <div className="flex-1 space-y-4 w-full">
              <div>
                <h3 className="font-medium">File Verification</h3>
                <p className="text-sm text-muted-foreground">
                  Check for duplicates and verify model metadata
                </p>
                <div className="mt-2">
                  <Label className="text-sm font-medium">File Types</Label>
                  <div className="flex gap-4 mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="file-type-3mf"
                        data-testid="file-type-3mf-checkbox"
                        checked={selectedFileTypes["3mf"]}
                        onCheckedChange={(checked) => onFileTypeChange("3mf", Boolean(checked))}
                      />
                      <Label htmlFor="file-type-3mf" className="cursor-pointer">3MF</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="file-type-stl"
                        data-testid="file-type-stl-checkbox"
                        checked={selectedFileTypes["stl"]}
                        onCheckedChange={(checked) => onFileTypeChange("stl", Boolean(checked))}
                      />
                      <Label htmlFor="file-type-stl" className="cursor-pointer">STL</Label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={onRunHashCheck}
                  disabled={isHashChecking || (!selectedFileTypes["3mf"] && !selectedFileTypes["stl"])}
                  data-testid="run-hash-check-button"
                  className="gap-2"
                >
                  {isHashChecking ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileCheck className="h-4 w-4" />
                  )}
                  {isHashChecking ? 'Checking...' : 'Run Check'}
                </Button>
                <Button
                  onClick={onGenerateModelJson}
                  disabled={isGeneratingJson || (!selectedFileTypes["3mf"] && !selectedFileTypes["stl"])}
                  data-testid="generate-json-button"
                  className="gap-2"
                  variant="secondary"
                >
                  {isGeneratingJson ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Files className="h-4 w-4" />
                  )}
                  {isGeneratingJson ? 'Generating...' : 'Generate'}
                </Button>
              </div>
            </div>

            {(hashCheckResult || generateResult) && (
              <div className="flex flex-wrap gap-4 mt-3 w-full" data-testid="integrity-results">
                {hashCheckResult && (
                  <>
                    <div key="verified-count" className="flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-green-600" />
                      <span className="text-sm" data-testid="verified-count">{hashCheckResult.verified} verified</span>
                    </div>
                    {hashCheckResult.corrupted > 0 && (
                      <div key="corrupted-count" className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-sm" data-testid="corrupted-count">{hashCheckResult.corrupted} issues</span>
                      </div>
                    )}
                    {hashCheckResult.duplicateGroups && hashCheckResult.duplicateGroups.length > 0 && (
                      <div key="duplicates-count" className="flex items-center gap-2">
                        <Files className="h-4 w-4 text-blue-600" />
                        <span className="text-sm" data-testid="duplicates-count">{hashCheckResult.duplicateGroups.length} duplicates</span>
                      </div>
                    )}
                  </>
                )}
                {generateResult && (
                  <>
                    {generateResult.processed && (
                      <div key="gen-processed-status" className="flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-green-600" />
                        <span className="text-sm" data-testid="processed-count">{generateResult.processed} processed</span>
                      </div>
                    )}
                    {generateResult.skipped && (
                      <div key="gen-skipped-count" className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-600" />
                        <span className="text-sm" data-testid="skipped-count">{generateResult.skipped} skipped</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {isHashChecking && (
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Checking files...</span>
              <Progress className="w-full" />
            </div>
          )}

          {hashCheckResult && hashCheckResult.corruptedFiles && hashCheckResult.corruptedFiles.length > 0 && (
            <div className="space-y-4">
              <Separator />
              <div>
                <h3 className="font-medium mb-2 text-red-600">Files Requiring Attention</h3>
                <div className="space-y-2" data-testid="corrupted-files-list">
                  {hashCheckResult.corruptedFiles.map((file, idx) => (
                    <div
                      key={`corrupt-${idx}-${file.filePath.replace(/[^a-zA-Z0-9]/g, '-')}`}
                      data-testid={`corrupted-file-${idx}`}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-red-900 dark:text-red-100 truncate">
                          {file.filePath.replace(/^[/\\]?models[/\\]?/, '')}
                        </p>
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {file.error || 'Hash mismatch or missing metadata'}
                        </p>
                      </div>
                      {onRegenerate && file.actualHash && file.expectedHash && file.expectedHash !== 'UNKNOWN' && file.actualHash !== file.expectedHash && (
                        <div className="mt-3 sm:mt-0 ml-0 sm:ml-4 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onRegenerate(file.model || { filePath: file.filePath })}
                            data-testid={`regenerate-button-${idx}`}
                          >
                            Regenerate
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {hashCheckResult && hashCheckResult.duplicateGroups && hashCheckResult.duplicateGroups.length > 0 && (
            <div className="space-y-4">
              <Separator />
              <div>
                <h3 className="font-medium mb-2">Duplicate Files</h3>
                <div className="space-y-2" data-testid="duplicate-groups-list">
                  {hashCheckResult.duplicateGroups.map((group, idx) => (
                    <div
                      key={`dup-${idx}`}
                      className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-blue-600 dark:text-blue-400">
                          {group.models.length} copies · {group.totalSize} total
                        </span>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                              <Trash2 className="h-4 w-4" />
                              Remove Duplicates
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Remove Duplicate Files</DialogTitle>
                              <DialogDescription>
                                Choose which file to keep. All other copies will be removed.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-2">
                              {group.models.map((model) => (
                                <div key={model.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                                  <div
                                    data-testid={`duplicate-model-info-${model.id}`}
                                    className={`flex items-center gap-2 min-w-0 flex-1 ${onModelClick ? 'cursor-pointer hover:opacity-75' : ''}`}
                                    onClick={() => onModelClick?.(model)}
                                  >
                                    {resolveModelThumbnail(model) && (
                                      <ImageWithFallback
                                        src={resolveModelThumbnail(model) as string}
                                        alt={model.name}
                                        className="w-10 h-10 object-cover rounded shrink-0"
                                      />
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium truncate">{model.name}</p>
                                      <p className="text-xs text-muted-foreground truncate">{getDisplayPath(model)}</p>
                                    </div>
                                  </div>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="ml-2 shrink-0"
                                    onClick={() => onRemoveDuplicates(group, model.id)}
                                  >
                                    Keep This
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="space-y-1">
                        {group.models.map((model) => (
                          <div key={model.id} className="flex items-center gap-2 px-1">
                            {resolveModelThumbnail(model) && (
                              <ImageWithFallback
                                src={resolveModelThumbnail(model) as string}
                                alt={model.name}
                                className="w-8 h-8 object-cover rounded shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm truncate">{model.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{getDisplayPath(model)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
