import { useState, useRef, useEffect } from "react";

// ...existing code...
import { Category } from "../types/category";
import { AppConfig } from "../types/config";
import { Model, DuplicateGroup, HashCheckResult, CorruptedFile } from "../types/model";
import { ConfigManager } from "../utils/configManager";
import { removeDuplicates } from "../utils/clientUtils";
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
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { 
  ArrowLeft, 
  GripVertical, 
  Download, 
  Upload, 
  RefreshCw, 
  Save, 
  FolderOpen,
  Settings as SettingsIcon,
  AlertCircle,
  Tag,
  Edit2,
  Trash2,
  Eye,
  BarChart3,
  Search,
  AlertTriangle,
  FileCheck,
  Files,
  Heart,
  Star,
  Github,
  Box,
  Images,
  Archive,
  FileText,
  Clock,
  HardDrive,
  RotateCcw,
  Plus
} from "lucide-react";
import { toast } from "sonner";

// Icon component for model thumbnails
const ModelThumbnail = ({ thumbnail, name }: { thumbnail: string | null | undefined; name: string }) => {
  if (thumbnail) {
    return (
      <img
        src={thumbnail}
        alt={name}
        className="w-8 h-8 object-cover rounded border"
        loading="lazy"
      />
    );
  }
  return (
    <div className="w-8 h-8 flex items-center justify-center bg-muted rounded border">
      <Box className="h-4 w-4 text-muted-foreground" />
    </div>
  )
};





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
  // Optional initial tab to open when the settings page mounts
  initialTab?: string;
  // Optional action requested by the parent (open settings and run an action)
  settingsAction?: null | { type: 'hash-check' | 'generate'; fileType: '3mf' | 'stl' };
  // Callback to notify parent that action was handled (or cleared)
  onActionHandled?: () => void;
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
  onDonationClick,
  initialTab,
  settingsAction,
  onActionHandled,
}: SettingsPageProps) {
  // Helper function to get a clean file path for display
  const getDisplayPath = (model: Model) => {
    if (model.modelUrl) {
      // Remove /models/ prefix and show the relative path
      return model.modelUrl.replace(/^\/models\//, '');
    }
    return model.name || 'Unknown';
  };

  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  // Start with the prop config if provided, otherwise fall back to ConfigManager (localStorage/defaults).
  const [localConfig, setLocalConfig] = useState<AppConfig>(() => {
    const initialConfig = config || ConfigManager.loadConfig();
    return initialConfig;
  });

  // Ensure SettingsPage prioritizes server-side `data/config.json` when loading.
  // This makes the Application settings reflect the canonical server config rather than a local-only value.
  useEffect(() => {
    let cancelled = false;

    async function loadServerConfig() {
      try {
        console.debug('[SettingsPage] fetching server config /api/load-config to initialize settings UI');
        const resp = await fetch('/api/load-config');
        if (!resp.ok) {
          console.debug('[SettingsPage] /api/load-config not available, status=', resp.status);
          return;
        }
        const data = await resp.json();
        if (data && data.success && data.config) {
          if (cancelled) return;
          console.debug('[SettingsPage] loaded server config, lastModified=', data.config.lastModified);
          setLocalConfig(data.config);
          setLocalCategories(data.config.categories || []);
          // don't call onConfigUpdate here automatically; leave to user Save actions
        }
      } catch (err) {
        console.warn('[SettingsPage] failed to fetch server config:', err);
      }
    }

    // Always attempt to load server config on mount to prefer it over stale localStorage
    loadServerConfig();

    return () => { cancelled = true; };
  }, []);

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
  const [viewTagModels, setViewTagModels] = useState<TagInfo | null>(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renameTagValue, setRenameTagValue] = useState('');
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  // Allow parent to control which tab is opened initially (e.g. "integrity")
  const [selectedTab, setSelectedTab] = useState<string>(initialTab ?? 'general');

  // If the parent changes initialTab while the page is mounted, respect it
  useEffect(() => {
    if (initialTab) {
      setSelectedTab(initialTab);
    }
  }, [initialTab]);

  // If parent opened settings with an action, run it and then notify parent
  useEffect(() => {
    if (!settingsAction) return;
    // Switch to the integrity tab so the user sees progress/results
    setSelectedTab('integrity');
    // Ensure file type selection reflects action
    setSelectedFileType(settingsAction.fileType);

    (async () => {
      try {
        if (settingsAction.type === 'hash-check') {
          // handleRunHashCheck is synchronous but triggers state updates/fetch
          handleRunHashCheck();
        } else if (settingsAction.type === 'generate') {
          await handleGenerateModelJson();
        }
      } catch (err) {
        console.error('Error running settingsAction:', err);
      } finally {
        onActionHandled?.();
      }
    })();
  }, [settingsAction]);

  // Category editing state
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isCategoryRenameDialogOpen, setIsCategoryRenameDialogOpen] = useState(false);
  const [renameCategoryValue, setRenameCategoryValue] = useState('');
  // Add category state
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState('');

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
        try {
          // Extract directory and filename, removing any leading /models or models/
          const normalizedPath = file.filePath.replace(/^[/\\]?models[/\\]/, '');
          const pathParts = normalizedPath.split(/[/\\]/);
          const fileName = pathParts.pop() || '';
          const directory = pathParts.join('/');
          
          // Convert .3mf to -munchie.json or .stl to -stl-munchie.json if needed
          const lowerFileName = fileName.toLowerCase();
          const munchieFileName = fileName.endsWith('-munchie.json') || fileName.endsWith('-stl-munchie.json')
            ? fileName
            : lowerFileName.endsWith('.stl') 
              ? fileName.replace(/\.stl$/i, '-stl-munchie.json')
              : lowerFileName.endsWith('.3mf')
                ? fileName.replace(/\.3mf$/i, '-munchie.json')
                : null; // Skip files that aren't model files
          
          // Skip if we couldn't determine the munchie file name
          if (!munchieFileName) {
            console.log('Skipping non-model file:', fileName);
            continue;
          }
          
          // Construct the final path, always starting with models/
          const fullPath = directory 
            ? `models/${directory}/${munchieFileName}`
            : `models/${munchieFileName}`;
          
          const response = await fetch(`/api/load-model?filePath=${encodeURIComponent(fullPath)}`);
          if (response.ok) {
            const modelData = await response.json();
            // The API returns the model data directly, not wrapped in a success structure
            if (modelData && typeof modelData === 'object') {
              // Store with the original file path as key for reliable lookup
              newModels[file.filePath] = modelData;
            }
          } else if (response.status === 404) {
            // File doesn't exist yet - this is expected for STL files that haven't been generated
            console.log('Munchie file not found (expected for new STL files):', fullPath);
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
  // Track which duplicate group's dialog is open (store group.hash or null)
  const [openDuplicateGroupHash, setOpenDuplicateGroupHash] = useState<string | null>(null);

  // File type selection state - "3mf" or "stl" only
  const [selectedFileType, setSelectedFileType] = useState<"3mf" | "stl">("3mf");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);
  // Track the active status toast id so we can update loading -> success/error
  const statusToastId = useRef<string | number | null>(null);

  // State for backup and restore functionality
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupHistory, setBackupHistory] = useState<Array<{
    name: string;
    timestamp: string;
    size: number;
    fileCount: number;
  }>>([]);
  const [restoreStrategy, setRestoreStrategy] = useState<'hash-match' | 'path-match' | 'force'>('hash-match');

  // State and handler for generating model JSONs via backend API
  const [isGeneratingJson, setIsGeneratingJson] = useState(false);
  const [generateResult, setGenerateResult] = useState<{ skipped: number } | null>(null);
  
  const handleGenerateModelJson = async () => {
    setIsGeneratingJson(true);
    setGenerateResult(null);
    const fileTypeText = selectedFileType === "3mf" ? ".3mf" : ".stl";
    setStatusMessage(`Generating JSON for all ${fileTypeText} files...`);
    try {
      const response = await fetch('/api/scan-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileType: selectedFileType })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSaveStatus('saved');
        setStatusMessage('Model JSON files generated successfully.');
        setGenerateResult({ skipped: data.skipped || 0 });
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

  // Clear generate results when switching tabs so the "skipped" count
  // doesn't persist when the user navigates to other sections (e.g. scanning)
  useEffect(() => {
    if (selectedTab !== 'generate' && generateResult) {
      setGenerateResult(null);
    }
  }, [selectedTab]);

  // Show status messages as toast notifications (using sonner's richer API)
  useEffect(() => {
    if (!statusMessage || saveStatus === 'idle') return;

    try {
      if (saveStatus === 'saving') {
        // Start or replace a loading toast
        if (statusToastId.current) {
          // update existing loading toast message by dismissing and creating a new one
          try { toast.dismiss(statusToastId.current); } catch {}
        }
        statusToastId.current = toast.loading(statusMessage);
      } else if (saveStatus === 'saved') {
        if (statusToastId.current) {
          toast.success(statusMessage, { id: statusToastId.current });
        } else {
          toast.success(statusMessage);
        }
        statusToastId.current = null;
        // clear the inline status after showing success
        setTimeout(() => {
          setSaveStatus('idle');
          setStatusMessage('');
        }, 3000);
      } else if (saveStatus === 'error') {
        if (statusToastId.current) {
          toast.error(statusMessage, { id: statusToastId.current });
        } else {
          toast.error(statusMessage);
        }
        statusToastId.current = null;
        // keep the inline error for a short while then clear
        setTimeout(() => {
          setSaveStatus('idle');
          setStatusMessage('');
        }, 5000);
      }
    } catch (err) {
      console.error('Toast error:', err);
    }
  }, [saveStatus, statusMessage]);

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

  const handleConfirmAddCategory = async () => {
    const label = newCategoryLabel.trim();
    if (!label) return;

    setSaveStatus('saving');
    setStatusMessage(`Adding category "${label}"...`);

    // Generate ID: lowercase, words separated by underscores, strip special chars
    let baseId = label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // remove non-alphanumeric except spaces
      .trim()
      .replace(/\s+/g, '_');
    let uniqueId = baseId;
    let counter = 1;
    while (localCategories.some(c => c.id === uniqueId)) {
      uniqueId = `${baseId}_${counter}`;
      counter++;
    }

  const newCat: Category = { id: uniqueId, label, icon: 'Tag' } as Category;
    const updatedCategories = [...localCategories, newCat];
    const updatedConfig: AppConfig = { ...localConfig, categories: updatedCategories };

    try {
      // Persist locally and server-side
      await handleSaveConfig(updatedConfig);

      // Update UI state after save
      setLocalCategories(updatedCategories);
      setLocalConfig(updatedConfig);
      onCategoriesUpdate(updatedCategories);
      onConfigUpdate?.(updatedConfig);

      setSaveStatus('saved');
      setStatusMessage(`Category "${label}" added`);
      setIsAddCategoryDialogOpen(false);
      setNewCategoryLabel('');
    } catch (error) {
      console.error('Failed to add category:', error);
      setSaveStatus('error');
      setStatusMessage('Failed to add category');
    }

    setTimeout(() => {
      setSaveStatus('idle');
      setStatusMessage('');
    }, 2500);
  };

  const handleSaveConfig = async (configToSave?: AppConfig) => {
    const config = configToSave || localConfig;
    // Stamp lastModified locally before saving
    config.lastModified = new Date().toISOString();
    setSaveStatus('saving');
    setStatusMessage('Saving configuration...');
    
    try {
      // Save to localStorage via ConfigManager
      ConfigManager.saveConfig(config);
      onConfigUpdate?.(config);

      // Additionally persist to server-side file in /data/config.json
      try {
        const resp = await fetch('/api/save-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });
        const result = await resp.json();
        if (!resp.ok || !result.success) {
          console.warn('Server-side config save failed:', result);
        } else {
          console.log('Server-side config saved to:', result.path);
          // If server returned the canonical config (with lastModified), update local state
          if (result.config) {
            const serverConfig: AppConfig = result.config;
            setLocalConfig(serverConfig);
            setLocalCategories(serverConfig.categories || []);
            onCategoriesUpdate(serverConfig.categories || []);
            onConfigUpdate?.(serverConfig);
            // Ensure localStorage matches server file
            ConfigManager.saveConfig(serverConfig);
          }
        }
      } catch (err) {
        console.warn('Failed to POST config to server:', err);
      }

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

  // Load configuration from server-side data/config.json and apply it
  const handleLoadServerConfig = async () => {
    setSaveStatus('saving');
    setStatusMessage('Loading configuration from server...');

    try {
      const resp = await fetch('/api/load-config');
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data?.error || 'Failed to load server config');
      }

      const serverConfig: AppConfig = data.config;
      // Clear local UI prefs and stored config to avoid local overrides
      try {
        console.debug('[SettingsPage] Clearing localStorage keys before applying server config');
        localStorage.removeItem('3d-model-muncher-ui-prefs');
        localStorage.removeItem('3d-model-muncher-config');
      } catch (err) {
        console.warn('[SettingsPage] Failed to clear localStorage keys:', err);
      }

      // Save server config to local storage so ConfigManager.loadConfig() will pick it up after reload
      ConfigManager.saveConfig(serverConfig);

      // Notify parent components and update local state
      setLocalConfig(serverConfig);
      setLocalCategories(serverConfig.categories || []);
      onCategoriesUpdate(serverConfig.categories || []);
      onConfigUpdate?.(serverConfig);

      setSaveStatus('saved');
      setStatusMessage('Configuration loaded from server — reloading app');

      // Small delay so the user sees the message, then reload to apply
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err) {
      console.error('Load server config error:', err);
      setSaveStatus('error');
      setStatusMessage('Failed to load configuration from server');
      setTimeout(() => {
        setSaveStatus('idle');
        setStatusMessage('');
      }, 3000);
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
      // Persist imported config to localStorage and server file
      await handleSaveConfig(importedConfig);
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
    // Persist reset config to server as well
    handleSaveConfig(defaultConfig);
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

  const handleRenameTag = async (oldTag: string, newTag: string) => {
    if (!newTag.trim() || oldTag === newTag.trim()) return;

    setSaveStatus('saving');
    setStatusMessage(`Renaming tag "${oldTag}" to "${newTag.trim()}"...`);

    const updatedModels = models.map(model => ({
      ...model,
      tags: model.tags.map(tag => tag === oldTag ? newTag.trim() : tag)
    }));

    // Save each updated model to its JSON file
    let saveErrors = 0;
    for (const model of updatedModels) {
      // Only save models that had the tag changed
      const originalModel = models.find(m => m.id === model.id);
      if (originalModel && originalModel.tags.includes(oldTag)) {
        try {
          // Construct the munchie.json file path
          let filePath;
          if (model.modelUrl) {
            // Convert modelUrl like "/models/Foo.3mf" to "Foo-munchie.json"
            const threeMfPath = model.modelUrl.replace(/^\/models\//, '');
            filePath = threeMfPath.replace(/\.3mf$/i, '-munchie.json');
          } else if (model.filePath) {
            // Use filePath if available, convert to munchie.json
            filePath = model.filePath.replace(/\.3mf$/i, '-munchie.json');
          } else {
            console.error('No file path available for model:', model.name);
            saveErrors++;
            continue;
          }

          const response = await fetch('/api/save-model', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filePath,
              id: model.id,
              tags: model.tags
            })
          });

          const result = await response.json();
          if (!result.success) {
            console.error('Failed to save model:', model.name, result.error);
            saveErrors++;
          }
        } catch (error) {
          console.error('Error saving model:', model.name, error);
          saveErrors++;
        }
      }
    }

    // Update the UI state
    onModelsUpdate(updatedModels);
    setIsRenameDialogOpen(false);
    setRenameTagValue('');
    setSelectedTag(null);
    setViewTagModels(null);
    
    if (saveErrors === 0) {
      setSaveStatus('saved');
      setStatusMessage(`Tag "${oldTag}" renamed to "${newTag.trim()}" and saved to files`);
    } else {
      setSaveStatus('error');
      setStatusMessage(`Tag renamed but ${saveErrors} file(s) failed to save`);
    }
    
    setTimeout(() => {
      setSaveStatus('idle');
      setStatusMessage('');
    }, 3000);
  };

  const handleDeleteTag = async (tagToDelete: string) => {
    setSaveStatus('saving');
    setStatusMessage(`Deleting tag "${tagToDelete}" from all models...`);

    const updatedModels = models.map(model => ({
      ...model,
      tags: model.tags.filter(tag => tag !== tagToDelete)
    }));

    // Save each updated model to its JSON file
    let saveErrors = 0;
    for (const model of updatedModels) {
      // Only save models that had the tag removed
      const originalModel = models.find(m => m.id === model.id);
      if (originalModel && originalModel.tags.includes(tagToDelete)) {
        try {
          // Construct the munchie.json file path
          let filePath;
          if (model.modelUrl) {
            // Convert modelUrl like "/models/Foo.3mf" to "Foo-munchie.json"
            const threeMfPath = model.modelUrl.replace(/^\/models\//, '');
            filePath = threeMfPath.replace(/\.3mf$/i, '-munchie.json');
          } else if (model.filePath) {
            // Use filePath if available, convert to munchie.json
            filePath = model.filePath.replace(/\.3mf$/i, '-munchie.json');
          } else {
            console.error('No file path available for model:', model.name);
            saveErrors++;
            continue;
          }

          const response = await fetch('/api/save-model', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filePath,
              id: model.id,
              tags: model.tags
            })
          });

          const result = await response.json();
          if (!result.success) {
            console.error('Failed to save model:', model.name, result.error);
            saveErrors++;
          }
        } catch (error) {
          console.error('Error saving model:', model.name, error);
          saveErrors++;
        }
      }
    }

    // Update the UI state
    onModelsUpdate(updatedModels);
    setSelectedTag(null);
    setViewTagModels(null);
    
    if (saveErrors === 0) {
      setSaveStatus('saved');
      setStatusMessage(`Tag "${tagToDelete}" deleted from all models and saved to files`);
    } else {
      setSaveStatus('error');
      setStatusMessage(`Tag deleted but ${saveErrors} file(s) failed to save`);
    }
    
    setTimeout(() => {
      setSaveStatus('idle');
      setStatusMessage('');
    }, 3000);
  };

  const handleViewTagModels = (tag: TagInfo) => {
    setViewTagModels(tag);
  };

  const startRenameTag = (tag: TagInfo) => {
    setSelectedTag(tag);
    setRenameTagValue(tag.name);
    setIsRenameDialogOpen(true);
  };

  // Category management functions
  const handleRenameCategory = async (oldCategoryId: string, newCategoryId: string, newCategoryLabel: string) => {
    if (!newCategoryId.trim() || !newCategoryLabel.trim() || oldCategoryId === newCategoryId.trim()) return;

    setSaveStatus('saving');
    setStatusMessage(`Renaming category "${oldCategoryId}" to "${newCategoryId.trim()}"...`);
    
    // Find the old category to get its label (since models store category by label, not ID)
    const oldCategory = localCategories.find(cat => cat.id === oldCategoryId);
    const oldCategoryLabel = oldCategory?.label || oldCategoryId;
    
    console.log('Category rename details:', { 
      oldCategoryId, 
      oldCategoryLabel, 
      newCategoryId: newCategoryId.trim(), 
      newCategoryLabel: newCategoryLabel.trim() 
    });

    // Update the category in the local categories list
    const updatedCategories = localCategories.map(cat => 
      cat.id === oldCategoryId 
        ? { ...cat, id: newCategoryId.trim(), label: newCategoryLabel.trim() }
        : cat
    );

    // Update all models that use this category (by label, not ID)
    const updatedModels = models.map(model => ({
      ...model,
      category: model.category === oldCategoryLabel ? newCategoryLabel.trim() : model.category
    }));

    console.log('Models to update:', models.filter(m => m.category === oldCategoryLabel).map(m => ({ name: m.name, id: m.id, oldCategory: m.category })));
    console.log('Updated models:', updatedModels.filter(m => m.category === newCategoryLabel.trim()).map(m => ({ name: m.name, id: m.id, newCategory: m.category })));

    // Save each updated model to its JSON file
    let saveErrors = 0;
    for (const model of updatedModels) {
      // Only save models that had the category changed
      const originalModel = models.find(m => m.id === model.id);
      if (originalModel && originalModel.category === oldCategoryLabel) {
        console.log('Processing model for category update:', { name: model.name, id: model.id, oldCategory: originalModel.category, newCategory: model.category });
        try {
          // Construct the munchie.json file path
          let filePath;
          if (model.modelUrl) {
            // Convert modelUrl like "/models/Foo.3mf" to "Foo-munchie.json"
            const threeMfPath = model.modelUrl.replace(/^\/models\//, '');
            filePath = threeMfPath.replace(/\.3mf$/i, '-munchie.json');
          } else if (model.filePath) {
            // Use filePath if available, convert to munchie.json
            filePath = model.filePath.replace(/\.3mf$/i, '-munchie.json');
          } else {
            console.error('No file path available for model:', model.name);
            saveErrors++;
            continue;
          }

          // Prepare the request with the same structure as working components
          const requestData = {
            filePath,
            id: model.id,
            category: model.category
          };

          console.log('Category save request:', requestData);
          const response = await fetch('/api/save-model', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
          });

          const result = await response.json();
          console.log('Category save response:', result);
          if (!result.success) {
            console.error('Failed to save model:', model.name, result.error);
            saveErrors++;
          }
        } catch (error) {
          console.error('Error saving model:', model.name, error);
          saveErrors++;
        }
      }
    }

    // Update the UI state
    setLocalCategories(updatedCategories);
    onCategoriesUpdate(updatedCategories);
    onModelsUpdate(updatedModels);
    setIsCategoryRenameDialogOpen(false);
    setRenameCategoryValue('');
    setSelectedCategory(null);
    
    if (saveErrors === 0) {
      setSaveStatus('saved');
      setStatusMessage(`Category "${oldCategoryLabel}" renamed to "${newCategoryLabel.trim()}" and saved to files`);
    } else {
      setSaveStatus('error');
      setStatusMessage(`Category renamed but ${saveErrors} file(s) failed to save`);
    }
    
    setTimeout(() => {
      setSaveStatus('idle');
      setStatusMessage('');
    }, 3000);
  };

  const startRenameCategory = (category: Category) => {
    setSelectedCategory(category);
    setRenameCategoryValue(category.label);
    setIsCategoryRenameDialogOpen(true);
  };

  // Run scanModelFile for all models, update models, and produce a HashCheckResult for UI compatibility
  const handleRunHashCheck = () => {
    // Clear any previous generate results so the UI doesn't show stale "skipped" counts
    if (generateResult) setGenerateResult(null);
    setIsHashChecking(true);
    setHashCheckProgress(0);
    const fileTypeText = selectedFileType === "3mf" ? ".3mf" : ".stl";
    setStatusMessage(`Rescanning ${fileTypeText} files and comparing hashes...`);
    fetch('/api/hash-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileType: selectedFileType })
    })
      .then(resp => resp.json())
      .then(data => {
      if (!data.success) throw new Error(data.error || 'Hash check failed');
      // Map backend results to hash check result
      let verified = 0;
      let corrupted = 0;
      const corruptedFiles: CorruptedFile[] = [];
      const duplicateGroups: DuplicateGroup[] = [];
      const hashToModels: Record<string, Model[]> = {};
      const updatedModels: Model[] = [];
      const usedIds = new Set<string>(); // Track used IDs to prevent duplicates
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
  printSettings: { layerHeight: '', infill: '', nozzle: '' },
        hash: '',
        lastScanned: '',
        source: '',
        price: 0,
        filePath: '' // Add required filePath
      };
      for (const r of data.results) {
        // Try to find the full model in the current models array for images/thumbnails
        const fullModel = models.find(m => {
          // Try multiple matching strategies
          if (m.name === r.baseName) return true;
          if (r.threeMF && m.modelUrl.endsWith(r.threeMF)) return true;
          if (r.stl && m.modelUrl.endsWith(r.stl)) return true;
          // Try with /models/ prefix
          if (r.threeMF && m.modelUrl === `/models/${r.threeMF}`) return true;
          if (r.stl && m.modelUrl === `/models/${r.stl}`) return true;
          // Try comparing the full modelUrl path (handling backslashes)
          const expectedUrl = r.threeMF ? `/models/${r.threeMF}` : r.stl ? `/models/${r.stl}` : '';
          if (m.modelUrl === expectedUrl) return true;
          // Try normalizing paths - convert backslashes to forward slashes
          const normalizedModelUrl = m.modelUrl.replace(/\\/g, '/');
          const normalizedExpectedUrl = expectedUrl.replace(/\\/g, '/');
          if (normalizedModelUrl === normalizedExpectedUrl) return true;
          // Try comparing just the filename
          const modelFileName = m.modelUrl?.split(/[/\\]/).pop()?.replace(/\.(3mf|stl)$/i, '');
          const hashFileName = (r.threeMF?.replace('.3mf', '') || r.stl?.replace('.stl', ''));
          return modelFileName && hashFileName && modelFileName === hashFileName;
        });
        
        // Create a unique ID that includes the full file path to ensure uniqueness
        const filePath = r.threeMF || r.stl || r.baseName;
        let baseId = fullModel?.id || `hash-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}-${r.hash?.substring(0, 8) || Date.now()}`;
        
        // Ensure ID is unique by adding a counter if necessary
        let uniqueId = baseId;
        let counter = 1;
        while (usedIds.has(uniqueId)) {
          uniqueId = `${baseId}-${counter}`;
          counter++;
        }
        usedIds.add(uniqueId);
        
        const mergedModel = {
          ...defaultModel,
          ...fullModel,
          id: uniqueId,
          name: fullModel?.name || r.baseName.split(/[/\\]/).pop()?.replace(/\.(3mf|stl)$/i, '') || r.baseName, // Use clean filename as name
          modelUrl: r.threeMF ? `/models/${r.threeMF}` : r.stl ? `/models/${r.stl}` : '',
          hash: r.hash,
          status: r.status
        };
        

        if (r.status === 'ok') {
          verified++;
        } else {
          corrupted++;
          // Add file info to corruptedFiles
          const filePath = r.threeMF ? `/models/${r.threeMF}` : r.stl ? `/models/${r.stl}` : '';
          corruptedFiles.push({
            model: mergedModel,
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
        corruptedFiles,
        corruptedFileDetails: corruptedFiles,
        lastCheck: new Date().toISOString()
      });
      onModelsUpdate(updatedModels);
      setSaveStatus('saved');
      setStatusMessage('Hash check complete. See results.');
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

  const handleRemoveDuplicates = async (group: DuplicateGroup, keepModelId: string): Promise<boolean> => {
    // Find models to remove (all except the one to keep)
    const modelsToRemove = group.models.filter(model => model.id !== keepModelId);
    // Collect model files and their corresponding munchie.json files
    const filesToDelete: string[] = [];
    modelsToRemove.forEach(model => {
      if (model.modelUrl) {
        // modelUrl is like /models/Foo.3mf or /models/Foo.stl
        const modelFile = model.modelUrl.replace(/^\/models\//, '');
        filesToDelete.push(modelFile);
        // Add corresponding munchie.json file
        if (modelFile.toLowerCase().endsWith('.3mf')) {
          const base = modelFile.replace(/\.3mf$/i, '');
          filesToDelete.push(base + '-munchie.json');
        } else if (modelFile.toLowerCase().endsWith('.stl')) {
          const base = modelFile.replace(/\.stl$/i, '');
          filesToDelete.push(base + '-stl-munchie.json');
        }
      }
    });
    if (filesToDelete.length === 0) {
      setSaveStatus('error');
      setStatusMessage('No files to delete.');
      return false;
    }
    setSaveStatus('saving');
    setStatusMessage('Deleting duplicate files...');
  try {
      const resp = await fetch('/api/delete-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: filesToDelete })
      });
      const data = await resp.json();
      if (!data.success) {
        setSaveStatus('error');
        setStatusMessage('Failed to delete some files: ' + (data.errors?.map((e: { file: string }) => e.file).join(', ') || 'Unknown error'));
        return false;
      }
      // Remove from UI
      const updatedModels = removeDuplicates(models, group, keepModelId);
      onModelsUpdate(updatedModels);
      // Update duplicate groups
      const updatedGroups = duplicateGroups.filter(g => g.hash !== group.hash);
      setDuplicateGroups(updatedGroups);
      const removedCount = group.models.length - 1;
      setSaveStatus('saved');
      setStatusMessage(`Removed ${removedCount} duplicate file${removedCount > 1 ? 's' : ''}`);
      setTimeout(() => {
        setSaveStatus('idle');
        setStatusMessage('');
      }, 3000);
      return true;
    } catch (error) {
      setSaveStatus('error');
      setStatusMessage('Failed to delete files.');
      console.error('Delete files error:', error);
      return false;
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

  // Backup and restore functions
  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    setSaveStatus('saving');
    setStatusMessage('Creating backup of munchie.json files...');

    try {
      const response = await fetch('/api/backup-munchie-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to create backup');
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || `munchie-backup-${new Date().toISOString().slice(0, 19)}.gz`;

      // Download the backup file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Update backup history
      const newBackup = {
        name: filename,
        timestamp: new Date().toISOString(),
        size: blob.size,
        fileCount: 0 // Will be updated if we parse the backup
      };
      setBackupHistory(prev => [newBackup, ...prev].slice(0, 10)); // Keep last 10 backups

      setSaveStatus('saved');
      setStatusMessage(`Backup created successfully: ${filename}`);
    } catch (error) {
      setSaveStatus('error');
      setStatusMessage('Failed to create backup');
      console.error('Backup creation error:', error);
    } finally {
      setIsCreatingBackup(false);
      setTimeout(() => {
        setSaveStatus('idle');
        setStatusMessage('');
      }, 3000);
    }
  };

  const handleRestoreFromFile = () => {
    backupFileInputRef.current?.click();
  };

  const handleBackupFileRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    setSaveStatus('saving');
    setStatusMessage('Restoring from backup file...');

    try {
      if (file.name.endsWith('.gz')) {
        // Use file upload for gzipped files
        const formData = new FormData();
        formData.append('backupFile', file);
        formData.append('strategy', restoreStrategy);

        const response = await fetch('/api/restore-munchie-files/upload', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Restore failed');
        }

        setSaveStatus('saved');
        setStatusMessage(`Restore completed: ${result.summary}`);
        console.log('Restore results:', result);
        
      } else {
        // Handle plain JSON files
        const buffer = await file.arrayBuffer();
        const backupData = new TextDecoder().decode(buffer);

        // Send restore request to backend
        const response = await fetch('/api/restore-munchie-files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            backupData,
            strategy: restoreStrategy
          })
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Restore failed');
        }

        setSaveStatus('saved');
        setStatusMessage(`Restore completed: ${result.summary}`);
        console.log('Restore results:', result);
      }
      
    } catch (error) {
      setSaveStatus('error');
      setStatusMessage('Failed to restore from backup');
      console.error('Restore error:', error);
    } finally {
      setIsRestoring(false);
      // Clear the file input
      event.target.value = '';
      setTimeout(() => {
        setSaveStatus('idle');
        setStatusMessage('');
      }, 3000);
    }
  };

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
            {/* Inline status alert: only show inline for errors. Other statuses are shown as toasts. */}
            {saveStatus === 'error' && statusMessage && (
              <Alert className={`border-red-500 bg-red-50 dark:bg-red-950`}>
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className={`text-red-700 dark:text-red-300`}>
                  {statusMessage}
                </AlertDescription>
              </Alert>
            )}

          {/* Settings Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="flex flex-wrap w-full gap-1 h-auto p-1 justify-start">
              <TabsTrigger value="general" className="flex-shrink-0">General</TabsTrigger>
              <TabsTrigger value="categories" className="flex-shrink-0">Categories</TabsTrigger>
              <TabsTrigger value="tags" className="flex-shrink-0">Tag Management</TabsTrigger>
              <TabsTrigger value="backup" className="flex-shrink-0">Backup & Restore</TabsTrigger>
              <TabsTrigger value="integrity" className="flex-shrink-0">File Integrity</TabsTrigger>
              <TabsTrigger value="support" className="flex-shrink-0">Support</TabsTrigger>
              <TabsTrigger value="config" className="flex-shrink-0">Configuration</TabsTrigger>
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
                    </div>
                  </div>
                  <Separator />

                  {/* Default Filters */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Default Filters</h3>
                    <p className="text-sm text-muted-foreground">Set default filter values when the app starts</p>
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
                  </div>                  
                  <Separator />

                  {/* Add Load Configuration button to Application Settings (matches Configuration tab) */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Apply Server Configuration</h3>
                    <p className="text-sm text-muted-foreground">Load the authoritative configuration from the server's <code>data/config.json</code>. This will clear local UI overrides.</p>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" onClick={handleLoadServerConfig} className="gap-2">
                        <Download className="h-4 w-4" />
                        Load Configuration
                      </Button>
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
                    Drag and drop to reorder categories. Click edit to rename categories and update all associated models.
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
                          <span className="text-sm text-muted-foreground hidden sm:inline">
                            ID: {category.id}
                          </span>
                        </span>
                        <div className="flex items-center gap-2 ml-auto">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              startRenameCategory(category);
                            }}
                            className="gap-2"
                          >
                            <Edit2 className="h-4 w-4" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  

                  <div className="flex items-center gap-3">
                    <Button onClick={handleSaveCategories} className="gap-2">
                      <Save className="h-4 w-4" />
                      Save Category Order
                    </Button>

                    <Button variant="secondary" onClick={() => setIsAddCategoryDialogOpen(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Category
                    </Button>
                  </div>

                </CardContent>
              </Card>
            </TabsContent>

            {/* Tag Management Tab */}
            <TabsContent value="tags" className="space-y-6">
              {/* Tag Statistics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
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
                            aria-label={`View ${tag.name}`}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="hidden sm:inline">View</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startRenameTag(tag)}
                            aria-label={`Rename ${tag.name}`}
                            className="gap-2"
                          >
                            <Edit2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Rename</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTag(tag.name)}
                            aria-label={`Delete ${tag.name}`}
                            className="gap-2 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Delete</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Backup & Restore Tab */}
            <TabsContent value="backup" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Archive className="h-5 w-5 text-primary" />
                    Backup & Restore
                  </CardTitle>
                  <CardDescription>
                    Create rolling backups of your model metadata and restore from previous backups. 
                    Backups include all *-munchie.json files with model metadata, tags, and settings.
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <div>
                              <p className="text-lg font-semibold">{models.length}</p>
                              <p className="text-xs text-muted-foreground">JSON Files</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            <div>
                              <p className="text-lg font-semibold">{backupHistory.length}</p>
                              <p className="text-xs text-muted-foreground">Backups Created</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <HardDrive className="h-4 w-4 text-primary" />
                            <div>
                              <p className="text-lg font-semibold">
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
                      <SelectTrigger>
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

                      {/* Strategy explanations - mobile friendly */}
                      <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg break-words overflow-x-hidden">
                      {restoreStrategy === 'hash-match' && (
                        <div>
                        <strong>Hash Match:</strong>
                        <span className="block mt-1">
                          Compares 3MF file hashes from backup with current files, then restores metadata to the matching munchie.json. Falls back to path matching if no hash match found.
                        </span>
                        <span className="block mt-1 text-primary font-semibold">Recommended for most users.</span>
                        </div>
                      )}
                      {restoreStrategy === 'path-match' && (
                        <div>
                        <strong>Path Match:</strong>
                        <span className="block mt-1">
                          Only restores files that currently exist at their original backup locations. Does not create new files.
                        </span>
                        <span className="block mt-1 text-primary font-semibold">Use to update existing metadata only.</span>
                        </div>
                      )}
                      {restoreStrategy === 'force' && (
                        <div>
                        <strong>Force Restore:</strong>
                        <span className="block mt-1">
                          Creates files at their original paths regardless of current state. Can overwrite existing files.
                        </span>
                        <span className="block mt-1 text-destructive font-semibold">Use with caution!</span>
                        </div>
                      )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={handleRestoreFromFile}
                        disabled={isRestoring}
                        variant="outline"
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
                      <strong>Note:</strong> Only model metadata (*-munchie.json) files are restored, not the actual 3MF files.
                    </div>
                  </div>

                  {/* Backup History */}
                  {backupHistory.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <h3 className="font-medium">Recent Backups</h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {backupHistory.map((backup, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <Archive className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium text-sm">{backup.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(backup.timestamp).toLocaleString()} • {(backup.size / 1024).toFixed(1)}KB
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* File Integrity Tab */}
            <TabsContent value="integrity" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>File Integrity Check</CardTitle>
                  <CardDescription>
                    Verify model files and manage metadata
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex-1 space-y-4">
                      <div>
                        <h3 className="font-medium">File Verification</h3>
                        <p className="text-sm text-muted-foreground">
                          Check for duplicates and verify model metadata
                        </p>
                        <div className="mt-2">
                          <Label className="text-sm font-medium">File Type</Label>
                          <RadioGroup 
                            value={selectedFileType} 
                            onValueChange={(value: "3mf" | "stl") => setSelectedFileType(value)}
                            className="flex gap-4 mt-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="3mf" id="file-type-3mf" />
                              <Label htmlFor="file-type-3mf">3MF only</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="stl" id="file-type-stl" />
                              <Label htmlFor="file-type-stl">STL only</Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>
                      <div className="flex gap-2">
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
                      <div className="flex flex-wrap gap-4 mt-3 md:mt-0 md:self-end">
                        {hashCheckResult && (
                          <>
                            <div key="verified-count" className="flex items-center gap-2">
                              <FileCheck className="h-4 w-4 text-green-600" />
                              <span className="text-sm">{hashCheckResult.verified} verified</span>
                            </div>
                            {hashCheckResult.corrupted > 0 && (
                              <div key="corrupted-count" className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                <span className="text-sm">{hashCheckResult.corrupted} issues</span>
                              </div>
                            )}
                            {hashCheckResult.duplicateGroups.length > 0 && (
                              <div key="duplicates-count" className="flex items-center gap-2">
                                <Files className="h-4 w-4 text-blue-600" />
                                <span className="text-sm">{hashCheckResult.duplicateGroups.length} duplicates</span>
                              </div>
                            )}
                            {(hashCheckResult.skipped || 0) > 0 && (
                              <div key="skipped-count" className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-600" />
                                <span className="text-sm">{hashCheckResult.skipped} skipped</span>
                              </div>
                            )}
                          </>
                        )}
                        {generateResult && generateResult.skipped > 0 && (
                          <div key="gen-skipped-count" className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-600" />
                            <span className="text-sm">{generateResult.skipped} skipped</span>
                          </div>
                        )}
                      </div>
                    )}
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

                  {hashCheckResult && hashCheckResult.corruptedFiles && hashCheckResult.corruptedFiles.length > 0 && (
                    <div className="space-y-4">
                      <Separator />
                      <div>
                        <h3 className="font-medium mb-2 text-red-600">Files Requiring Attention</h3>
                        <div className="space-y-2">
                          {hashCheckResult.corruptedFiles.map((file, idx) => {
                            const modelData = corruptedModels[file.filePath];
                            // Better fallback logic - try multiple ways to find the model
                            const fallbackModel = models.find(m => {
                              // Try exact match first
                              if (m.modelUrl === file.filePath) return true;
                              // Try with /models/ prefix
                              if (m.modelUrl === `/models/${file.filePath}`) return true;
                              // Try without /models/ prefix
                              if (m.modelUrl === file.filePath.replace(/^[/\\]?models[/\\]/, '')) return true;
                              // Try by comparing just the filename
                              const fileBaseName = file.filePath.split(/[/\\]/).pop()?.replace(/\.(3mf|stl)$/i, '');
                              const modelBaseName = m.modelUrl?.split(/[/\\]/).pop()?.replace(/\.(3mf|stl)$/i, '');
                              return fileBaseName && modelBaseName && fileBaseName === modelBaseName;
                            });
                            
                            const model = modelData || fallbackModel;
                            
                            return (
                              <div key={file.filePath || `corrupt-${idx}`} 
                                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800"
                                >
                                  <div className="min-w-0 flex-1">
                                  <p className="font-medium text-red-900 dark:text-red-100 truncate">
                                    {model ? getDisplayPath(model) : file.filePath.split('/').pop()?.replace(/\.(3mf|stl)$/i, '') || 'Unknown'}
                                  </p>
                                  <p className="text-sm text-red-600 dark:text-red-400">
                                    {file.error || `Missing metadata or hash mismatch`}
                                  </p>
                                </div>
                                {model && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                      onClick={() => onModelClick?.(model)}
                                      className="mt-3 sm:mt-0 ml-0 sm:ml-4 shrink-0"
                                  >
                                    View
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {hashCheckResult && hashCheckResult.duplicateGroups && hashCheckResult.duplicateGroups.length > 0 && (
                    <div className="space-y-4">
                      <Separator />
                      <div>
                        <h3 className="font-medium mb-2">Duplicate Files</h3>
                        <div className="space-y-2">
                          {hashCheckResult.duplicateGroups.map((group, idx) => (
                            <div 
                              key={`dup-${idx}`}
                              className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800"
                            >
                              <div key={`header-${group.hash}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                                <span className="text-sm text-blue-600 dark:text-blue-400">
                                  {group.models.length} copies - {group.totalSize} total
                                </span>
                                <Dialog open={openDuplicateGroupHash === group.hash} onOpenChange={(open: boolean) => setOpenDuplicateGroupHash(open ? group.hash : null)}>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-2"
                                      onClick={() => setOpenDuplicateGroupHash(group.hash)}
                                    >
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
                                        <div key={`dup-dialog-${group.hash}-${model.id}-${model.name}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 bg-muted rounded-md gap-2">
                                          <div className="flex items-center gap-2 min-w-0 flex-1">
                                            {model.thumbnail ? (
                                              <img
                                                src={model.thumbnail}
                                                alt={model.name}
                                                className="w-8 h-8 object-cover rounded border"
                                                loading="lazy"
                                              />
                                            ) : (
                                              <div className="w-8 h-8 flex items-center justify-center bg-muted rounded border">
                                                <Box className="h-4 w-4 text-muted-foreground" />
                                              </div>
                                            )}
                                            <span className="text-sm truncate">{getDisplayPath(model)}</span>
                                          </div>
                                          <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={async () => {
                                              const success = await handleRemoveDuplicates(group, model.id);
                                              if (success) {
                                                // Close the dialog for this group
                                                setOpenDuplicateGroupHash(null);
                                              }
                                            }}
                                          >
                                            Keep This
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                              <div key={`models-${group.hash}`} className="space-y-2">
                                {group.models.map((model) => (
                                  <div key={`dup-list-${group.hash}-${model.id}-${model.name}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <ModelThumbnail thumbnail={model.thumbnail} name={model.name} />
                                      <span className="text-sm truncate">{getDisplayPath(model)}</span>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onModelClick?.(model)}
                                    >
                                      View
                                    </Button>
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
                  {/*
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
                  */}
                  {/* Ways to Support */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Ways to Support</h3>
                    
                    <div className="grid gap-4">
                      <button
                        type="button"
                        onClick={onDonationClick}
                        aria-label="Donate"
                        className="w-full text-left flex items-center gap-4 p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border border-primary/20 cursor-pointer transform transition duration-150 ease-in-out hover:scale-105 hover:from-primary/10 hover:to-secondary/10 hover:border-2 hover:border-primary hover:bg-primary/6 dark:hover:border-primary dark: hover:bg-primary/900 hover:ring-2 hover:ring-primary/40 dark:hover:ring-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/50 transition-colors"
                      >
                        <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
                          <Heart className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">Financial Support</h4>
                          <p className="text-sm text-muted-foreground">
                            Buy me a coffee or sponsor development through various platforms
                          </p>
                        </div>
                        <span className="hidden sm:inline-flex items-center gap-2">
                          <Heart className="h-4 w-4" />
                          Donate
                        </span>
                      </button>

                      <a
                        href="https://github.com/robsturgill/3d-model-muncher"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Star on GitHub"
                        className="w-full text-left flex items-center gap-4 p-4 bg-muted/30 rounded-lg border cursor-pointer transform transition duration-150 ease-in-out hover:scale-105 hover:bg-muted/50 dark:hover:bg-muted/70 hover:border-2 hover:border-primary hover:ring-2 hover:ring-primary/40 dark:hover:ring-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/50 transition-colors"
                      >
                        <div className="flex items-center justify-center w-12 h-12 bg-muted rounded-lg">
                          <Star className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">Star on GitHub</h4>
                          <p className="text-sm text-muted-foreground">
                            Show your appreciation and help others discover the project
                          </p>
                        </div>
                        <span className="hidden sm:inline-flex items-center gap-2">
                          <Github className="h-4 w-4" />
                          Star
                        </span>
                      </a>

                      <a
                        href="https://github.com/robsturgill/3d-model-muncher"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Contribute on GitHub"
                        className="w-full text-left flex items-center gap-4 p-4 bg-muted/30 rounded-lg border cursor-pointer transform transition duration-150 ease-in-out hover:scale-105 hover:bg-muted/50 dark:hover:bg-muted/70 hover:border-2 hover:border-primary hover:ring-2 hover:ring-primary/40 dark:hover:ring-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/50 transition-colors"
                      >
                        <div className="flex items-center justify-center w-12 h-12 bg-muted rounded-lg">
                          <Github className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">Contribute Code</h4>
                          <p className="text-sm text-muted-foreground">
                            Help improve the project by contributing code, reporting bugs, or suggesting features
                          </p>
                        </div>
                        <span className="hidden sm:inline-flex items-center gap-2">
                          <Github className="h-4 w-4" />
                          Contribute
                        </span>
                      </a>
                    </div>
                  </div>

                  {/* Community */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    <img 
                      src="/images/munchie-side.png"
                      alt="Community mascot"
                      width="200"
                      className="w-32 sm:w-[200px] h-auto flex-shrink-0 mx-auto sm:mx-0"
                    />                    
                    <div className="flex-1 w-full flex flex-col justify-center space-y-3 text-left">
                      <h3 className="font-medium">Join the Community</h3>
                      <ul className="text-sm text-muted-foreground space-y-2 text-left list-disc list-inside">
                        <li>• Share your 3D printing projects and experiences</li>
                        <li>• Get help from fellow makers and developers</li>
                        <li>• Suggest new features and improvements</li>
                        <li>• Stay updated on the latest releases</li>
                      </ul>
                    </div>
                  </div>

                  <div className="text-center p-6 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border border-primary/20">
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
                    <div className="flex items-center gap-3">
                      <Button onClick={() => handleSaveConfig()} className="gap-2">
                        <Save className="h-4 w-4" />
                        Save Configuration
                      </Button>

                      <Button variant="outline" onClick={handleLoadServerConfig} className="gap-2">
                        <Download className="h-4 w-4" />
                        Load Configuration
                      </Button>
                    </div>
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

          {/* Hidden file input for backup restore */}
          <input
            type="file"
            ref={backupFileInputRef}
            onChange={handleBackupFileRestore}
            accept=".gz,.json"
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

          {/* Category Rename Dialog */}
          <Dialog open={isCategoryRenameDialogOpen} onOpenChange={setIsCategoryRenameDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rename Category</DialogTitle>
                <DialogDescription>
                  This will rename the category across all models that use it.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rename-category">New category name</Label>
                  <Input
                    id="rename-category"
                    value={renameCategoryValue}
                    onChange={(e) => setRenameCategoryValue(e.target.value)}
                    placeholder="Enter new category name"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCategoryRenameDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (selectedCategory && renameCategoryValue.trim()) {
                      // Generate a new ID based on the label, or keep the same ID if it's just a label change
                      const newId = renameCategoryValue.trim().toLowerCase().replace(/\s+/g, '-');
                      handleRenameCategory(selectedCategory.id, newId, renameCategoryValue.trim());
                    }
                  }}
                  disabled={!renameCategoryValue.trim() || renameCategoryValue === selectedCategory?.label}
                >
                  Rename Category
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Category Dialog */}
          <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Category</DialogTitle>
                <DialogDescription>
                  Create a new category. This will be saved to your configuration.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-category">Category name</Label>
                  <Input
                    id="new-category"
                    value={newCategoryLabel}
                    onChange={(e) => setNewCategoryLabel(e.target.value)}
                    placeholder="Enter category name"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddCategoryDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmAddCategory} disabled={!newCategoryLabel.trim()}>
                  Add Category
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Tag Models View Dialog */}
          <Dialog open={!!viewTagModels} onOpenChange={() => setViewTagModels(null)}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Models with tag: "{viewTagModels?.name}"</DialogTitle>
                <DialogDescription>
                  {viewTagModels?.count} model{viewTagModels?.count !== 1 ? 's' : ''} found
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-96 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {viewTagModels?.models.map((model) => (
                    <div
                      key={model.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer"
                      onClick={() => {
                        onModelClick?.(model);
                        setViewTagModels(null);
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