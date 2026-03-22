import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Archive, RefreshCw, RotateCcw, Clock, HardDrive } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";

interface BackupTabProps {
  models: any[];
  backupHistory: Array<{ name: string; timestamp: string; size: number; fileCount: number }>;
  onCreateBackup: () => Promise<void>;
  onRestoreFromFile: (strategy: 'hash-match' | 'path-match' | 'force', collectionsStrategy: 'merge' | 'replace') => void;
}

export function BackupTab({
  models,
  backupHistory,
  onCreateBackup,
  onRestoreFromFile,
}: BackupTabProps) {
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreStrategy, setRestoreStrategy] = useState<'hash-match' | 'path-match' | 'force'>('hash-match');
  const [collectionsRestoreStrategy, setCollectionsRestoreStrategy] = useState<'merge' | 'replace'>('merge');

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      await onCreateBackup();
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreFromFile = () => {
    setIsRestoring(true);
    try {
      onRestoreFromFile(restoreStrategy, collectionsRestoreStrategy);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div data-testid="backup-tab">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-primary" />
            Backup & Restore
          </CardTitle>
          <CardDescription>
            Create rolling backups of your model metadata and restore from previous backups.
            Backups include all *-munchie.json files with model metadata, tags, and settings, plus your collections.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Backup Section */}
          <div className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <h3 className="font-medium">Create Backup</h3>
                <p className="text-sm text-muted-foreground">
                  Backup all model metadata files to a compressed archive
                </p>
              </div>
              <Button 
                onClick={handleCreateBackup}
                disabled={isCreatingBackup}
                data-testid="create-backup-button"
                className="gap-2 md:ml-4"
              >
                {isCreatingBackup ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
                {isCreatingBackup ? 'Creating...' : 'Create Backup'}
              </Button>
            </div>

            {/* Backup Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Archive className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-lg font-semibold" data-testid="models-count">{models.length}</p>
                      <p className="text-xs text-muted-foreground">JSON Files</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-lg font-semibold" data-testid="last-backup-size">
                        {backupHistory.length > 0 
                          ? `${(backupHistory[0]?.size / 1024).toFixed(1)}KB`
                          : '0KB'
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">Last Backup Size</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          {/* Restore Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">Restore from Backup</h3>
              <p className="text-sm text-muted-foreground">
                Restore model metadata from a previous backup file. Choose your restore strategy carefully.
              </p>
            </div>

            {/* Restore Strategy Selection */}
            <div className="space-y-3">
              <Label>Restore Strategy</Label>
              <Select
                value={restoreStrategy}
                onValueChange={(value: 'hash-match' | 'path-match' | 'force') => setRestoreStrategy(value)}
              >
                <SelectTrigger data-testid="restore-strategy-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hash-match">
                    <div className="font-medium">Hash Match <span className="text-xs text-muted-foreground sm:hidden">(Recommended)</span></div>
                    <div className="text-xs text-muted-foreground hidden sm:block">
                      Match files by content hash, fallback to path if needed
                    </div>
                  </SelectItem>
                  <SelectItem value="path-match">
                    <div className="font-medium">Path Match</div>
                    <div className="text-xs text-muted-foreground hidden sm:block">
                      Only restore files that exist at their original paths
                    </div>
                  </SelectItem>
                  <SelectItem value="force">
                    <div className="font-medium">Force Restore</div>
                    <div className="text-xs text-muted-foreground hidden sm:block">
                      Restore all files to original paths, create directories if needed
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Collections Restore Strategy */}
            <div className="space-y-3">
              <Label>Collections Restore</Label>
              <Select
                value={collectionsRestoreStrategy}
                onValueChange={(value: 'merge' | 'replace') => setCollectionsRestoreStrategy(value)}
              >
                <SelectTrigger data-testid="collections-strategy-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merge">
                    <div className="font-medium">Merge <span className="text-xs text-muted-foreground sm:hidden">(Default)</span></div>
                    <div className="text-xs text-muted-foreground hidden sm:block">
                      Combine backup collections with existing ones by ID; backup wins on conflict
                    </div>
                  </SelectItem>
                  <SelectItem value="replace">
                    <div className="font-medium">Replace</div>
                    <div className="text-xs text-muted-foreground hidden sm:block">
                      Overwrite existing collections with those from the backup
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleRestoreFromFile}
                disabled={isRestoring}
                variant="outline"
                data-testid="restore-from-file-button"
                className="gap-2"
              >
                {isRestoring ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                {isRestoring ? 'Restoring...' : 'Restore from File'}
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <strong>Supported formats:</strong> .gz (compressed backup), .json (plain backup)
              <br />
              <strong>Note:</strong> Restores model metadata files and collections. Actual 3MF/STL models are not included in backups.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
