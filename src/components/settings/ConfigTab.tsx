import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Download, Upload, RefreshCw, Save } from "lucide-react";

interface ConfigTabProps {
  onExportConfig: () => void;
  onImportConfig: () => void;
  onResetConfig: () => void;
  onSaveConfig: () => void;
  onLoadServerConfig: () => Promise<void>;
}

export function ConfigTab({
  onExportConfig,
  onImportConfig,
  onResetConfig,
  onSaveConfig,
  onLoadServerConfig,
}: ConfigTabProps) {
  return (
    <div data-testid="config-tab">
      <Card>
        <CardHeader>
          <CardTitle>Configuration Management</CardTitle>
          <CardDescription>
            Import, export, and reset your configuration settings. Your settings are stored in your browser's local storage, not in the default-config.json file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={onExportConfig}
              data-testid="export-config-button"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export Config
            </Button>
            
            <Button
              onClick={onImportConfig}
              variant="outline"
              data-testid="import-config-button"
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Import Config
            </Button>
            
            <Button
              onClick={onResetConfig}
              variant="destructive"
              data-testid="reset-config-button"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reset to Defaults
            </Button>
          </div>

          <div className="border-t pt-6 space-y-4">
            <h3 className="font-medium">Manual Save</h3>
            <p className="text-sm text-muted-foreground">
              Save your current configuration manually. This is useful when auto-save is disabled.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              <Button
                onClick={onSaveConfig}
                data-testid="save-config-button"
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Save Configuration
              </Button>

              <Button
                variant="outline"
                onClick={onLoadServerConfig}
                data-testid="load-config-button"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Load Configuration
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
