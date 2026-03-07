import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";
import { Download, Edit2, Save } from "lucide-react";
import { AppConfig } from "../../types/config";
import { useState } from "react";

interface GeneralTabProps {
  config: AppConfig;
  onConfigFieldChange: (field: string, value: any) => void;
  onSaveConfig: (config?: AppConfig) => Promise<void>;
  onLoadServerConfig: () => Promise<void>;
}

export function GeneralTab({
  config,
  onConfigFieldChange,
  onSaveConfig,
  onLoadServerConfig,
}: GeneralTabProps) {
  const [isEditingModelDir, setIsEditingModelDir] = useState(false);
  const [tempModelDir, setTempModelDir] = useState('');

  return (
    <Card data-testid="general-tab">
      <CardHeader>
        <CardTitle>Application Settings</CardTitle>
        <CardDescription>
          Configure your application preferences and behavior
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default-view">Default View</Label>
            <Select
              value={config.settings.defaultView}
              onValueChange={(v) => onConfigFieldChange('settings.defaultView', v)}
            >
              <SelectTrigger id="default-view" data-testid="default-view-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grid</SelectItem>
                <SelectItem value="list">List</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="auto-save">Auto-save settings</Label>
            <div className="flex items-center gap-3">
              <Switch
                id="auto-save"
                data-testid="auto-save-switch"
                checked={config.settings.autoSave}
                onCheckedChange={(v: boolean) => onConfigFieldChange('settings.autoSave', v)}
              />
              <div className="text-sm text-muted-foreground">
                Automatically save settings when changed
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="font-medium">Models Directory</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2">
              {!isEditingModelDir ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2 bg-muted rounded-md font-mono text-sm break-all">
                    {(config as any)?.settings?.modelsDirectory || './models'}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid="edit-model-dir-button"
                    onClick={() => {
                      setTempModelDir((config as any)?.settings?.modelsDirectory || './models');
                      setIsEditingModelDir(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    value={tempModelDir}
                    data-testid="model-dir-input"
                    onChange={(e) => setTempModelDir(e.target.value)}
                    placeholder="./models or C:\models"
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid="save-model-dir-button"
                    onClick={async () => {
                      try {
                        const newConfig = {
                          ...config,
                          settings: { ...config.settings, modelsDirectory: tempModelDir }
                        };
                        await onSaveConfig(newConfig);
                        setIsEditingModelDir(false);
                        setTempModelDir('');
                      } catch (err) {
                        console.error('Failed to save model directory:', err);
                      }
                    }}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    data-testid="cancel-model-dir-button"
                    onClick={() => {
                      setIsEditingModelDir(false);
                      setTempModelDir('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
          <div className="col-span-1 md:col-span-2 text-sm text-muted-foreground">
            <p>
              Server reads model files from this directory. Enter an absolute path (e.g. <code>C:\\models</code>) or a path relative to the app (e.g. <code>./models</code>). Make sure the server process can write to the folder (network shares or external drives may need extra permissions).
              <br></br>(Unraid & Docker handle mappings differently and should use the default <code>./models</code>).
            </p>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="font-medium">Apply Server Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Load the authoritative configuration from the server's <code>data/config.json</code>. This will clear local UI overrides.
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              data-testid="load-server-config-button"
              onClick={onLoadServerConfig}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Load Configuration
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="verbose-scan-logs">Verbose Scan Logs</Label>
            <div className="flex items-center gap-3">
              <Switch
                id="verbose-scan-logs"
                data-testid="verbose-scan-logs-switch"
                checked={Boolean((config as any).settings.verboseScanLogs)}
                onCheckedChange={(v: boolean) => onConfigFieldChange('settings.verboseScanLogs', v)}
              />
              <div className="text-sm text-muted-foreground">
                Enable detailed per-directory scanning logs (debug-level). Useful for troubleshooting; keep off for normal use.
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
