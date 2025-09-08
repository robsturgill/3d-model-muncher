import { useState, useRef, useEffect } from "react";
// import { scanDirectory } from "../utils/threeMFToJson";
// ...existing code...
import { Category } from "../types/category";
import { AppConfig } from "../types/config";
import { Model, DuplicateGroup, HashCheckResult, CorruptedFile } from "../types/model";
import { ConfigManager } from "../utils/configManager";
import { performHashCheck, findDuplicates, removeDuplicates, calculateSpaceSavings, scanModelFile } from "../utils/fileManager";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { ScrollArea } from "./ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Progress } from "./ui/progress";
import { 
  ArrowLeft, 
  GripVertical, 
  Download, 
  Upload, 
  RefreshCw, 
  Save, 
  FolderOpen,
  Settings as SettingsIcon,
  Info,
  CheckCircle,
  AlertCircle,
  Tag,
  Edit2,
  Trash2,
  Eye,
  BarChart3,
  Plus,
  Search,
  X,
  Shield,
  Copy,
  AlertTriangle,
  HardDrive,
  FileCheck,
  Files,
  Heart,
  Star,
  Github,
  Coffee,
  Box,
  Images
} from "lucide-react";



interface CorruptedFile {
  model: Model;
  error: string;
  actualHash: string;
  expectedHash: string;
  filePath: string;
}

interface SettingsPageProps {
  onBack: () => void;
  categories: Category[];
  onCategoriesUpdate: (categories: Category[]) => void;
  config?: AppConfig;
  onConfigUpdate?: (config: AppConfig) => void;
  models: Model[];
  onModelsUpdate: (models: Model[]) => void;
  onModelClick?: (model: Model) => void;
  onDonationClick?: () => void;
}

interface TagInfo {
  name: string;
  count: number;
  models: Model[];
}

export function SettingsPage({ 
  onBack, 
  categories, 
  onCategoriesUpdate,
  config,
  onConfigUpdate,
  models,
  onModelsUpdate,
  onModelClick,
  onDonationClick
}: SettingsPageProps) {
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [localConfig, setLocalConfig] = useState<AppConfig>(() => {
    const initialConfig = config || ConfigManager.loadConfig();
    return initialConfig;
  });

  // Keep localConfig in sync with parent config prop
  useEffect(() => {
    if (config) {
      setLocalConfig(prevConfig => {
        // Only update if the configs are different
        if (JSON.stringify(prevConfig) !== JSON.stringify(config)) {
          return config;
        }
        return prevConfig;
      });
    }
  }, [config]);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<TagInfo | null>(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renameTagValue, setRenameTagValue] = useState('');
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('general');
  type UIHashCheckResult = {
    verified: number;
    corrupted: number;
    duplicateGroups: DuplicateGroup[];
    corruptedFiles: CorruptedFile[];
  };
  const [hashCheckResult, setHashCheckResult] = useState<HashCheckResult | null>(null);
  const [isHashChecking, setIsHashChecking] = useState(false);
  const [hashCheckProgress, setHashCheckProgress] = useState(0);
  const [corruptedModels, setCorruptedModels] = useState<Record<string, Model>>({});

  // Load corrupted model data when hash check results change
  useEffect(() => {
    if (!hashCheckResult?.corruptedFiles) return;
    
    const loadCorruptedModels = async () => {
      const newModels: Record<string, Model> = {};
      
      for (const file of hashCheckResult.corruptedFiles) {
        console.log('Processing file:', {
          originalPath: file.filePath,
          modelUrl: file.model?.modelUrl,
          error: file.error
        });
        
        try {
          // Extract directory and filename, removing any leading /models or models/
          const normalizedPath = file.filePath.replace(/^[/\\]?models[/\\]/, '');
          const pathParts = normalizedPath.split(/[/\\]/);
          const fileName = pathParts.pop() || '';
          const directory = pathParts.join('/');
          
          console.log('Path parts:', {
            normalizedPath,
            directory,
            fileName,
            filePath: file.filePath
          });
          
          // Convert .3mf to -munchie.json if needed
          const munchieFileName = fileName.endsWith('-munchie.json')
            ? fileName
            : fileName.replace('.3mf', '-munchie.json');
          
          // Construct the final path, always starting with models/
          const fullPath = directory 
            ? `models/${directory}/${munchieFileName}`
            : `models/${munchieFileName}`;
          
          console.log('Making request with path:', fullPath);
          
          const response = await fetch(`http://localhost:3001/api/load-model?filePath=${encodeURIComponent(fullPath)}`);
          if (response.ok) {
            const modelData = await response.json();
            if (modelData.success) {
                  newModels[file.filePath] = modelData.model;
            }
          }
        } catch (error) {
          console.error('Failed to load model data:', error);
        }
      }
      
      setCorruptedModels(newModels);
    };
    
    loadCorruptedModels();
  }, [hashCheckResult?.corruptedFiles]);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [selectedDuplicateGroup, setSelectedDuplicateGroup] = useState<DuplicateGroup | null>(null);
  const [isRemoveDuplicateDialogOpen, setIsRemoveDuplicateDialogOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // State and handler for generating model JSONs via backend API
  const [isGeneratingJson, setIsGeneratingJson] = useState(false);
  const handleGenerateModelJson = async () => {
    setIsGeneratingJson(true);
    setStatusMessage('Generating JSON for all .3mf files...');
    try {
      const response = await fetch('http://localhost:3001/api/scan-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSaveStatus('saved');
        setStatusMessage('Model JSON files generated successfully.');
      } else {
        setSaveStatus('error');
        setStatusMessage(data.message || 'Failed to generate model JSON files.');
      }
    } catch (error) {
      setSaveStatus('error');
      setStatusMessage('Failed to generate model JSON files.');
      console.error('Model JSON generation error:', error);
    } finally {
      setIsGeneratingJson(false);
    }
  };

  // Get all unique tags with their usage information
  const getAllTags = (): TagInfo[] => {
    const tagMap = new Map<string, TagInfo>();
    
    if (!models) {
      return [];
    }

    models.forEach(model => {
      if (!model || !Array.isArray(model.tags)) {
        return;
      }

      model.tags.forEach(tag => {
        if (!tag) {
          return;
        }

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

  const filteredTags = getAllTags().filter(tag =>
    tag && tag.name ? tag.name.toLowerCase().includes((tagSearchTerm || '').toLowerCase()) : false
  );

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newCategories = [...localCategories];
    const draggedItem = newCategories[draggedIndex];
    
    newCategories.splice(draggedIndex, 1);
    newCategories.splice(index, 0, draggedItem);
    
    setLocalCategories(newCategories);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSaveCategories = () => {
    onCategoriesUpdate(localCategories);
    
    // Update config with new categories
    const updatedConfig = {
      ...localConfig,
      categories: localCategories
    };
    
    setLocalConfig(updatedConfig);
    handleSaveConfig(updatedConfig);
  };

  const handleSaveConfig = async (configToSave?: AppConfig) => {
    const config = configToSave || localConfig;
    setSaveStatus('saving');
    setStatusMessage('Saving configuration...');
    
    try {
      ConfigManager.saveConfig(config);
      onConfigUpdate?.(config);
      setSaveStatus('saved');
      setStatusMessage('Configuration saved successfully');
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
        setStatusMessage('');
      }, 3000);
    } catch (error) {
      setSaveStatus('error');
      setStatusMessage('Failed to save configuration');
      console.error('Save config error:', error);
    }
  };

  const handleExportConfig = () => {
    try {
      ConfigManager.exportConfig(localConfig);
      setSaveStatus('saved');
      setStatusMessage('Configuration exported successfully');
      
      setTimeout(() => {
        setSaveStatus('idle');
        setStatusMessage('');
      }, 3000);
    } catch (error) {
      setSaveStatus('error');
      setStatusMessage('Failed to export configuration');
      console.error('Export config error:', error);
    }
  };

  const handleImportConfig = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSaveStatus('saving');
    setStatusMessage('Importing configuration...');

    try {
      const importedConfig = await ConfigManager.importConfig(file);
      setLocalConfig(importedConfig);
      setLocalCategories(importedConfig.categories);
      onCategoriesUpdate(importedConfig.categories);
      onConfigUpdate?.(importedConfig);
      
      setSaveStatus('saved');
      setStatusMessage('Configuration imported successfully');
      
      setTimeout(() => {
        setSaveStatus('idle');
        setStatusMessage('');
      }, 3000);
    } catch (error) {
      setSaveStatus('error');
      setStatusMessage('Failed to import configuration');
      console.error('Import config error:', error);
    }

    // Clear the file input
    event.target.value = '';
  };

  const handleResetConfig = () => {
    const defaultConfig = ConfigManager.resetConfig();
    setLocalConfig(defaultConfig);
    setLocalCategories(defaultConfig.categories);
    onCategoriesUpdate(defaultConfig.categories);
    onConfigUpdate?.(defaultConfig);
    
    setSaveStatus('saved');
    setStatusMessage('Configuration reset to defaults');
    
    setTimeout(() => {
      setSaveStatus('idle');
      setStatusMessage('');
    }, 3000);
  };

  const handleConfigFieldChange = (field: string, value: any) => {
    const updatedConfig = { ...localConfig };
    
    if (field.includes('.')) {
      const [section, key] = field.split('.');
      
      if (section === 'settings') {
        updatedConfig.settings = {
          ...updatedConfig.settings,
          [key]: value
        };
      } else if (section === 'filters') {
        updatedConfig.filters = {
          ...updatedConfig.filters,
          [key]: value
        };
      }
    } else {
      (updatedConfig as any)[field] = value;
    }
    
    console.log('[SettingsPage] Updated config:', updatedConfig);
    setLocalConfig(updatedConfig);
    
    // Always notify parent of config changes
    onConfigUpdate?.(updatedConfig);
    
    // If auto-save is enabled, also save locally
    if (localConfig.settings.autoSave) {
      handleSaveConfig(updatedConfig);
    }
  };

  const handleRenameTag = (oldTag: string, newTag: string) => {
    if (!newTag.trim() || oldTag === newTag.trim()) return;

    const updatedModels = models.map(model => ({
      ...model,
      tags: model.tags.map(tag => tag === oldTag ? newTag.trim() : tag)
    }));

    onModelsUpdate(updatedModels);
    setIsRenameDialogOpen(false);
    setRenameTagValue('');
    setSelectedTag(null);
    
    setSaveStatus('saved');
    setStatusMessage(`Tag "${oldTag}" renamed to "${newTag.trim()}"`);
    
    setTimeout(() => {
      setSaveStatus('idle');
      setStatusMessage('');
    }, 3000);
  };

  const handleDeleteTag = (tagToDelete: string) => {
    const updatedModels = models.map(model => ({
      ...model,
      tags: model.tags.filter(tag => tag !== tagToDelete)
    }));

    onModelsUpdate(updatedModels);
    setSelectedTag(null);
    
    setSaveStatus('saved');
    setStatusMessage(`Tag "${tagToDelete}" deleted from all models`);
    
    setTimeout(() => {
      setSaveStatus('idle');
      setStatusMessage('');
    }, 3000);
  };

  const handleViewTagModels = (tag: TagInfo) => {
    setSelectedTag(tag);
  };

  const startRenameTag = (tag: TagInfo) => {
    setSelectedTag(tag);
    setRenameTagValue(tag.name);
    setIsRenameDialogOpen(true);
  };

  // Run scanModelFile for all models, update models, and produce a HashCheckResult for UI compatibility
  const handleRunHashCheck = () => {
    setIsHashChecking(true);
    setHashCheckProgress(0);
    setStatusMessage('Rescanning .3mf files and comparing hashes...');
    fetch('http://localhost:3001/api/hash-check')
      .then(resp => resp.json())
      .then(data => {
      if (!data.success) throw new Error(data.error || 'Hash check failed');
      // Map backend results to UIHashCheckResult
      let verified = 0;
      let corrupted = 0;
      const corruptedFiles: Model[] = [];
      const duplicateGroups: DuplicateGroup[] = [];
      const hashToModels: Record<string, Model[]> = {};
      const updatedModels: Model[] = [];
      // Default Model shape for missing fields
      const defaultModel: Model = {
        id: '',
        name: '',
        thumbnail: '',
        images: [],
        tags: [],
        isPrinted: false,
        printTime: '',
        filamentUsed: '',
        category: 'Utility', // Set a default category
        description: '',
        fileSize: '',
        modelUrl: '',
        license: '',
        notes: '',
        printSettings: { layerHeight: '', infill: '', supports: '' },
        hash: '',
        lastScanned: '',
        source: '',
        price: 0,
        filePath: '' // Add required filePath
      };
      for (const r of data.results) {
        // Try to find the full model in the current models array for images/thumbnails
        const fullModel = models.find(m => m.name === r.baseName || m.modelUrl.endsWith(r.threeMF || ''));
        const mergedModel = {
          ...defaultModel,
          ...fullModel,
          name: r.baseName,
          modelUrl: r.threeMF ? `/models/${r.threeMF}` : '',
          hash: r.hash,
          status: r.status
        };
        if (r.status === 'ok') {
          verified++;
        } else {
          corrupted++;
          // Add file info to corruptedFiles
          const filePath = r.threeMF ? `/models/${r.threeMF}` : '';
          corruptedFiles.push({
            filePath: filePath,
            error: r.details || 'Unknown error',
            actualHash: r.hash || 'UNKNOWN',
            expectedHash: r.storedHash || 'UNKNOWN'
          });
        }
        if (r.hash) {
          if (!hashToModels[r.hash]) hashToModels[r.hash] = [];
          hashToModels[r.hash].push(mergedModel);
        }
        updatedModels.push(mergedModel);
      }
      // Find duplicate groups
      for (const hash in hashToModels) {
        if (hashToModels[hash].length > 1) {
          duplicateGroups.push({ hash, models: hashToModels[hash], totalSize: '0' });
        }
      }
      setDuplicateGroups(duplicateGroups);
      setHashCheckResult({
        verified,
        corrupted,
        duplicateGroups,
        corruptedFiles
      });
      onModelsUpdate(updatedModels);
      setSaveStatus('saved');
      setStatusMessage('Hash check complete. See results below.');
      setTimeout(() => {
        setSaveStatus('idle');
        setStatusMessage('');
      }, 4000);
      })
      .catch(error => {
        setSaveStatus('error');
        setStatusMessage('Model scan failed');
        console.error('Model scan error:', error);
      })
      .finally(() => {
        setIsHashChecking(false);
        setHashCheckProgress(0);
      });
  };

  const handleRemoveDuplicates = async (group: DuplicateGroup, keepModelId: string) => {
    // Find models to remove (all except the one to keep)
    const modelsToRemove = group.models.filter(model => model.id !== keepModelId);
    // Collect .3mf and -munchie.json file names for each
    const filesToDelete: string[] = [];
    modelsToRemove.forEach(model => {
      if (model.modelUrl) {
        // modelUrl is like /models/Foo.3mf
        const threeMF = model.modelUrl.replace(/^\/models\//, '');
        filesToDelete.push(threeMF);
        // Add corresponding -munchie.json
        const base = threeMF.replace(/\.3mf$/i, '');
        filesToDelete.push(base + '-munchie.json');
      }
    });
    if (filesToDelete.length === 0) {
      setSaveStatus('error');
      setStatusMessage('No files to delete.');
      return;
    }
    setSaveStatus('saving');
    setStatusMessage('Deleting duplicate files...');
    try {
      const resp = await fetch('http://localhost:3001/api/delete-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: filesToDelete })
      });
      const data = await resp.json();
      if (!data.success) {
        setSaveStatus('error');
        setStatusMessage('Failed to delete some files: ' + (data.errors?.map((e: { file: string }) => e.file).join(', ') || 'Unknown error'));
        return;
      }
      // Remove from UI
      const updatedModels = removeDuplicates(models, group, keepModelId);
      onModelsUpdate(updatedModels);
      // Update duplicate groups
      const updatedGroups = duplicateGroups.filter(g => g.hash !== group.hash);
      setDuplicateGroups(updatedGroups);
      setSelectedDuplicateGroup(null);
      setIsRemoveDuplicateDialogOpen(false);
      const removedCount = group.models.length - 1;
      setSaveStatus('saved');
      setStatusMessage(`Removed ${removedCount} duplicate file${removedCount > 1 ? 's' : ''}`);
      setTimeout(() => {
        setSaveStatus('idle');
        setStatusMessage('');
      }, 3000);
    } catch (error) {
      setSaveStatus('error');
      setStatusMessage('Failed to delete files.');
      console.error('Delete files error:', error);
    }
  };

  const getTagStats = () => {
    const allTags = getAllTags();
    const totalTags = allTags.length;
    const totalUsages = allTags.reduce((sum, tag) => sum + tag.count, 0);
    const avgUsage = totalTags > 0 ? (totalUsages / totalTags).toFixed(1) : '0';
    
    return { totalTags, totalUsages, avgUsage };
  };

  const stats = getTagStats();

  return (
    <div className="h-full bg-background">
      <ScrollArea className="h-full">
        <div className="p-6 max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center gap-4 pb-6 border-b">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-primary rounded-xl shadow-lg">
                <SettingsIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">Settings</h1>
                <p className="text-muted-foreground">Manage your 3D Model Muncher configuration</p>
              </div>
            </div>
          </div>

          {/* Status Alert */}
          {saveStatus !== 'idle' && statusMessage && (
            <Alert className={`${
              saveStatus === 'saved' ? 'border-green-500 bg-green-50 dark:bg-green-950' : 
              saveStatus === 'error' ? 'border-red-500 bg-red-50 dark:bg-red-950' : 
              'border-blue-500 bg-blue-50 dark:bg-blue-950'
            }`}>
              {saveStatus === 'saved' && <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />}
              {saveStatus === 'error' && <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />}
              {saveStatus === 'saving' && <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />}
              <AlertDescription className={`${
                saveStatus === 'saved' ? 'text-green-700 dark:text-green-300' : 
                saveStatus === 'error' ? 'text-red-700 dark:text-red-300' : 
                'text-blue-700 dark:text-blue-300'
              }`}>
                {statusMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Settings Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="tags">Tag Management</TabsTrigger>
              <TabsTrigger value="integrity">File Integrity</TabsTrigger>
              <TabsTrigger value="duplicates">Duplicates</TabsTrigger>
              <TabsTrigger value="support">Support</TabsTrigger>
              <TabsTrigger value="config">Configuration</TabsTrigger>
            </TabsList>

            {/* General Settings Tab */}
            <TabsContent value="general" className="space-y-6">
              {/* Application Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Application Settings</CardTitle>
                  <CardDescription>Configure default behavior and preferences. Changes are automatically saved to your browser&apos;s local storage.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="default-theme">Default Theme</Label>
                      <Select 
                        value={localConfig.settings.defaultTheme}
                        onValueChange={(value: string) => handleConfigFieldChange('settings.defaultTheme', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="default-view">Default View</Label>
                      <Select 
                        value={localConfig.settings.defaultView}
                        onValueChange={(value: string) => handleConfigFieldChange('settings.defaultView', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="grid">Grid</SelectItem>
                          <SelectItem value="list">List</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="grid-density">Default Grid Density</Label>
                      <Select 
                        value={localConfig.settings.defaultGridDensity.toString()}
                        onValueChange={(value: string) => handleConfigFieldChange('settings.defaultGridDensity', parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Column</SelectItem>
                          <SelectItem value="2">2 Columns</SelectItem>
                          <SelectItem value="3">3 Columns</SelectItem>
                          <SelectItem value="4">4 Columns</SelectItem>
                          <SelectItem value="5">5 Columns</SelectItem>
                          <SelectItem value="6">6 Columns</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="default-model-view">Default Model View</Label>
                      <Select 
                        value={localConfig.settings.defaultModelView}
                        onValueChange={(value: string) => handleConfigFieldChange('settings.defaultModelView', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="images">
                            <div className="flex items-center gap-2">
                              <Images className="h-4 w-4" />
                              Images
                            </div>
                          </SelectItem>
                          <SelectItem value="3d">
                            <div className="flex items-center gap-2">
                              <Box className="h-4 w-4" />
                              3D Model
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Choose which view opens by default when viewing model details
                      </p>
                    </div>

                    <div className="flex items-center space-x-3 pt-6 md:col-span-2">
                      <Switch
                        checked={localConfig.settings.autoSave}
                        onCheckedChange={(checked: boolean) => handleConfigFieldChange('settings.autoSave', checked)}
                        id="auto-save"
                      />
                      <Label htmlFor="auto-save">Auto-save configuration</Label>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-medium">Directory Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="model-dir">Model Directory</Label>
                        <div className="flex gap-2">
                          <Input
                            value={localConfig.settings.modelDirectory}
                            onChange={(e) => handleConfigFieldChange('settings.modelDirectory', e.target.value)}
                            placeholder="./models"
                          />
                          <Button variant="outline" size="sm" className="px-3">
                            <FolderOpen className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="export-dir">Export Directory</Label>
                        <div className="flex gap-2">
                          <Input
                            value={localConfig.settings.exportDirectory}
                            onChange={(e) => handleConfigFieldChange('settings.exportDirectory', e.target.value)}
                            placeholder="./exports"
                          />
                          <Button variant="outline" size="sm" className="px-3">
                            <FolderOpen className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Default Filters */}
              <Card>
                <CardHeader>
                  <CardTitle>Default Filters</CardTitle>
                  <CardDescription>Set default filter values when the app starts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Default Category</Label>
                      <Select 
                        value={localConfig.filters.defaultCategory}
                        onValueChange={(value: string) => handleConfigFieldChange('filters.defaultCategory', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {localCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Default Print Status</Label>
                      <Select 
                        value={localConfig.filters.defaultPrintStatus}
                        onValueChange={(value: string) => handleConfigFieldChange('filters.defaultPrintStatus', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="printed">Printed</SelectItem>
                          <SelectItem value="not-printed">Not Printed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Default License</Label>
                      <Select 
                        value={localConfig.filters.defaultLicense}
                        onValueChange={(value: string) => handleConfigFieldChange('filters.defaultLicense', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Licenses</SelectItem>
                          <SelectItem value="Creative Commons - Attribution">CC Attribution</SelectItem>
                          <SelectItem value="Creative Commons - Attribution-ShareAlike">CC Attribution-ShareAlike</SelectItem>
                          <SelectItem value="MIT License">MIT License</SelectItem>
                          <SelectItem value="GNU GPL v3">GNU GPL v3</SelectItem>
                          <SelectItem value="Apache License 2.0">Apache License 2.0</SelectItem>
                          <SelectItem value="Public Domain">Public Domain</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Categories Tab */}
            <TabsContent value="categories" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Categories</CardTitle>
                  <CardDescription>
                    Drag and drop to reorder categories. The order will be reflected in the sidebar.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {localCategories.map((category, index) => (
                      <div
                        key={category.id}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`
                          flex items-center gap-3 p-3 bg-muted rounded-lg border border-border
                          cursor-move hover:bg-accent/50 transition-colors duration-200
                          ${draggedIndex === index ? 'opacity-50' : ''}
                        `}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline" className="font-medium">
                          {category.label}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          ID: {category.id}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button onClick={handleSaveCategories} className="gap-2">
                      <Save className="h-4 w-4" />
                      Save Category Order
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tag Management Tab */}
            <TabsContent value="tags" className="space-y-6">
              {/* Tag Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2">
                      <Tag className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-2xl font-semibold">{stats.totalTags}</p>
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
                        <p className="text-2xl font-semibold">{stats.totalUsages}</p>
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
                        <p className="text-2xl font-semibold">{stats.avgUsage}</p>
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
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Tags List */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredTags.map((tag) => (
                      <div key={tag.name} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="font-medium">
                            {tag.name}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Used in {tag.count} model{tag.count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewTagModels(tag)}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startRenameTag(tag)}
                            className="gap-2"
                          >
                            <Edit2 className="h-4 w-4" />
                            Rename
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTag(tag.name)}
                            className="gap-2 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* File Integrity Tab */}
            <TabsContent value="integrity" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>File Integrity Check</CardTitle>
                  <CardDescription>
                    Verify your model files are intact and identify any files with issues
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Hash Verification</h3>
                      <p className="text-sm text-muted-foreground">
                        Generate and verify file hashes to detect corruption
                      </p>
                    </div>
                    <Button 
                      onClick={handleRunHashCheck}
                      disabled={isHashChecking}
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
                      onClick={handleGenerateModelJson}
                      disabled={isGeneratingJson}
                      className="gap-2 ml-2"
                      variant="secondary"
                    >
                      {isGeneratingJson ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Files className="h-4 w-4" />
                      )}
                      {isGeneratingJson ? 'Generating...' : 'Generate Model JSONs'}
                    </Button>
                  </div>

                  {isHashChecking && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{Math.round(hashCheckProgress)}%</span>
                      </div>
                      <Progress value={hashCheckProgress} className="w-full" />
                    </div>
                  )}

                  {hashCheckResult && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                              <FileCheck className="h-5 w-5 text-green-600" />
                              <div>
                                <p className="text-xl font-semibold">{hashCheckResult.verified}</p>
                                <p className="text-sm text-muted-foreground">Verified</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-red-600" />
                              <div>
                                <p className="text-xl font-semibold">{hashCheckResult.corrupted}</p>
                                <p className="text-sm text-muted-foreground">Issues</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                              <Files className="h-5 w-5 text-blue-600" />
                              <div>
                                <p className="text-xl font-semibold">{hashCheckResult.duplicateGroups.length}</p>
                                <p className="text-sm text-muted-foreground">Duplicate Groups</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {hashCheckResult.corruptedFiles.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-red-600">File Issues</CardTitle>
                            <CardDescription>These files may have issues and should be reviewed</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {hashCheckResult.corruptedFiles.map((file, idx) => {
    const modelData = corruptedModels[file.filePath];
    // Find a fallback model if we haven't loaded the data yet
    const fallbackModel = models.find(m => m.modelUrl === file.filePath);

    return (
      <div 
        key={file.filePath || `corrupt-${idx}`} 
        className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800"
      >
        <div>
          <p className="font-medium text-red-900 dark:text-red-100">
            {modelData?.name || fallbackModel?.name || file.filePath.split('/').pop()?.replace('.3mf', '')}
          </p>
          <p className="text-sm text-red-600 dark:text-red-400">
            {file.error || `Hash mismatch - Expected: ${file.expectedHash}, Got: ${file.actualHash}`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onModelClick?.(modelData || fallbackModel)}
          className="border-red-300 hover:bg-red-100 dark:border-red-700 dark:hover:bg-red-900"
        >
          View Details
        </Button>
      </div>
    );
})}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Duplicates Tab */}
            <TabsContent value="duplicates" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Duplicate Management</CardTitle>
                  <CardDescription>
                    Find and remove duplicate files to save storage space
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {duplicateGroups.length === 0 ? (
                    <div className="text-center py-8">
                      <Files className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-medium mb-2">No Duplicates Found</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Run a hash check first to find duplicate files
                      </p>
                      <Button onClick={handleRunHashCheck} className="gap-2">
                        <FileCheck className="h-4 w-4" />
                        Run Hash Check
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Found {duplicateGroups.length} duplicate groups</h3>
                          <p className="text-sm text-muted-foreground">
                            Potential space savings: {calculateSpaceSavings(duplicateGroups)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {duplicateGroups.map((group, index) => (
                          <Card key={group.hash || index}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium">Duplicate Group {index + 1}</h4>
                                <Badge variant="outline">{group.models.length} files</Badge>
                              </div>
                              
                              <div className="space-y-2">
                                {group.models.map((model, idx) => (
                                  <div key={model.id || idx} className="flex items-center justify-between p-2 bg-muted rounded">
                                    <div className="flex items-center gap-3">
                                      <img
                                        src={model.thumbnail || '/placeholder.png'}
                                        alt={model.name || 'Model thumbnail'}
                                        className="w-10 h-10 object-cover rounded border"
                                        onError={e => { e.currentTarget.src = '/placeholder.png'; }}
                                      />
                                      <div>
                                        <p className="font-medium">{model.name}</p>
                                        <p className="text-sm text-muted-foreground">{model.fileSize}</p>
                                      </div>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => onModelClick?.(model)}
                                    >
                                      View
                                    </Button>
                                  </div>
                                ))}
                              </div>
                              
                              <div className="flex justify-end mt-3">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <button
                                      type="button"
                                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Remove Duplicates
                                    </button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Remove Duplicate Files</DialogTitle>
                                      <DialogDescription>
                                        Choose which file to keep. All other duplicates will be removed.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-2">
                                      {group.models.map((model, idx) => (
                                        <div key={model.id || idx} className="flex items-center justify-between p-3 border rounded">
                                          <div className="flex items-center gap-3">
                                            <img
                                              src={model.thumbnail}
                                              alt={model.name}
                                              className="w-8 h-8 object-cover rounded"
                                            />
                                            <div>
                                              <p className="font-medium">{model.name}</p>
                                              <p className="text-sm text-muted-foreground">{model.category}</p>
                                            </div>
                                          </div>
                                          <Button
                                            onClick={() => handleRemoveDuplicates(group, model.id)}
                                            size="sm"
                                          >
                                            Keep This
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Support Tab */}
            <TabsContent value="support" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-primary" />
                    Support 3D Model Muncher
                  </CardTitle>
                  <CardDescription>
                    Help keep this project alive and growing! Your support enables continued development and new features.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Project Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="font-semibold text-xl text-primary">1.2k+</div>
                        <div className="text-sm text-muted-foreground">Active Users</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="font-semibold text-xl text-primary">Free</div>
                        <div className="text-sm text-muted-foreground">Always</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="font-semibold text-xl text-primary">Open</div>
                        <div className="text-sm text-muted-foreground">Source</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Ways to Support */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Ways to Support</h3>
                    
                    <div className="grid gap-4">
                      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border border-primary/20">
                        <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
                          <Heart className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">Financial Support</h4>
                          <p className="text-sm text-muted-foreground">
                            Buy me a coffee or sponsor development through various platforms
                          </p>
                        </div>
                        <Button onClick={onDonationClick} className="gap-2">
                          <Heart className="h-4 w-4" />
                          Donate
                        </Button>
                      </div>

                      <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border">
                        <div className="flex items-center justify-center w-12 h-12 bg-muted rounded-lg">
                          <Star className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">Star on GitHub</h4>
                          <p className="text-sm text-muted-foreground">
                            Show your appreciation and help others discover the project
                          </p>
                        </div>
                        <Button variant="outline" className="gap-2" asChild>
                          <a href="https://github.com/3d-model-muncher" target="_blank" rel="noopener noreferrer">
                            <Github className="h-4 w-4" />
                            Star
                          </a>
                        </Button>
                      </div>

                      <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border">
                        <div className="flex items-center justify-center w-12 h-12 bg-muted rounded-lg">
                          <Github className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">Contribute Code</h4>
                          <p className="text-sm text-muted-foreground">
                            Help improve the project by contributing code, reporting bugs, or suggesting features
                          </p>
                        </div>
                        <Button variant="outline" className="gap-2" asChild>
                          <a href="https://github.com/3d-model-muncher/contribute" target="_blank" rel="noopener noreferrer">
                            <Github className="h-4 w-4" />
                            Contribute
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Community */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Join the Community</h3>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>• Share your 3D printing projects and experiences</p>
                      <p>• Get help from fellow makers and developers</p>
                      <p>• Suggest new features and improvements</p>
                      <p>• Stay updated on the latest releases</p>
                    </div>
                  </div>

                  <div className="text-center p-6 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border border-primary/20">
                    <Heart className="h-8 w-8 text-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-primary">Thank you</strong> for using 3D Model Muncher! 
                      Your support helps keep this project free and open-source for the entire 3D printing community.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Configuration Tab */}
            <TabsContent value="config" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configuration Management</CardTitle>
                  <CardDescription>Import, export, and reset your configuration settings. Your settings are stored in your browser&apos;s local storage, not in the default-config.json file.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button onClick={handleExportConfig} className="gap-2">
                      <Download className="h-4 w-4" />
                      Export Config
                    </Button>
                    
                    <Button onClick={handleImportConfig} variant="outline" className="gap-2">
                      <Upload className="h-4 w-4" />
                      Import Config
                    </Button>
                    
                    <Button onClick={handleResetConfig} variant="destructive" className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Reset to Defaults
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-medium">Manual Save</h3>
                    <p className="text-sm text-muted-foreground">
                      Save your current configuration manually. This is useful when auto-save is disabled.
                    </p>
                    <Button onClick={() => handleSaveConfig()} className="gap-2">
                      <Save className="h-4 w-4" />
                      Save Configuration
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Hidden file input for import */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileImport}
            accept=".json"
            style={{ display: 'none' }}
          />

          {/* Tag Rename Dialog */}
          <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
            <DialogContent>
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
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => selectedTag && handleRenameTag(selectedTag.name, renameTagValue)}
                  disabled={!renameTagValue.trim() || renameTagValue === selectedTag?.name}
                >
                  Rename Tag
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Tag Models View Dialog */}
          <Dialog open={!!selectedTag} onOpenChange={() => setSelectedTag(null)}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Models with tag: "{selectedTag?.name}"</DialogTitle>
                <DialogDescription>
                  {selectedTag?.count} model{selectedTag?.count !== 1 ? 's' : ''} found
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-96 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedTag?.models.map((model) => (
                    <div
                      key={model.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer"
                      onClick={() => {
                        onModelClick?.(model);
                        setSelectedTag(null);
                      }}
                    >
                      <img
                        src={model.thumbnail}
                        alt={model.name}
                        className="w-12 h-12 object-cover rounded border"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{model.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {model.category}
                          </Badge>
                          <span className={model.isPrinted ? 'text-green-600' : 'text-yellow-600'}>
                            {model.isPrinted ? 'Printed' : 'Not Printed'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </ScrollArea>
    </div>
  );
}