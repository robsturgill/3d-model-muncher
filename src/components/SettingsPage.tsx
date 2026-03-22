import { useState, useRef, useEffect, lazy, Suspense, useMemo } from "react";
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
import { LICENSES } from '../constants/licenses';
import { Switch } from "./ui/switch";
import { Checkbox } from "./ui/checkbox";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { ScrollArea } from "./ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Progress } from "./ui/progress";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import * as LucideIcons from 'lucide-react';
import { GeneralTab } from "./settings/GeneralTab";
import { CategoriesTab } from "./settings/CategoriesTab";
import { TagsTab } from "./settings/TagsTab";
import { BackupTab } from "./settings/BackupTab";
import { IntegrityTab } from "./settings/IntegrityTab";
import { ConfigTab } from "./settings/ConfigTab";
import { SupportTab } from "./settings/SupportTab";
const {
  ArrowLeft,
  GripVertical,
  Download,
  Upload,
  RefreshCw,
  Save,
  Settings: SettingsIcon,
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
  Plus,
  FileText,
  Clock,
  HardDrive,
  RotateCcw,
  X
} = LucideIcons;
import { toast } from 'sonner';
import { ImageWithFallback } from './ImageWithFallback';
import { getLabel } from '../constants/labels';
import { resolveModelThumbnail } from '../utils/thumbnailUtils';

// Thumbnail resolver: prefer model object, fall back to explicit prop
const ModelThumbnail = ({ thumbnail, name, model }: { thumbnail?: string | null; name: string; model?: any }) => {
  const src = model ? resolveModelThumbnail(model) : (thumbnail || '');

  if (src) {
    return (
      <ImageWithFallback
        src={src}
        alt={name}
        className="w-8 h-8 object-cover rounded border"
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
  // Selected tab (controlled by parent via left sidebar)
  selectedTab: string;
  onTabChange: (tab: string) => void;
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
  selectedTab,
  onTabChange,
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

  // Remove internal selectedTab state as it's now controlled by parent
  // const [selectedTab, setSelectedTab] = useState<string>(initialTab || 'general');

  // Prefer server-side `data/config.json` over local defaults on load
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
  // State for editing the model directory path
  const [isEditingModelDir, setIsEditingModelDir] = useState(false);
  const [tempModelDir, setTempModelDir] = useState('');
  const [selectedTag, setSelectedTag] = useState<TagInfo | null>(null);
  const [viewTagModels, setViewTagModels] = useState<TagInfo | null>(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renameTagValue, setRenameTagValue] = useState('');
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const tagInputRef = useRef<HTMLInputElement | null>(null);
  
  // Compute categories that appear in model munchie.json files but are not in the configured categories list.
  const unmappedCategories = useMemo(() => {
    const configuredLabels = new Set(localCategories.map(c => c.label.toLowerCase()));
    const counts: Record<string, number> = {};
    models.forEach(m => {
      const raw = (m.category ?? '').toString().trim();
      if (!raw) return;
      // If the model's category (by label) isn't in configured categories, count it as unmapped
      if (!configuredLabels.has(raw.toLowerCase())) {
        counts[raw] = (counts[raw] || 0) + 1;
      }
    });
    return Object.keys(counts).map(label => ({ label, count: counts[label] })).sort((a, b) => b.count - a.count);
  }, [models, localCategories]);

  // selectedTab is now controlled by parent via props (no internal state needed)

  // If parent opened settings with an action, run it and then notify parent
  useEffect(() => {
    if (!settingsAction) return;
  // Switch to integrity tab and capture fileType to avoid async state races
  onTabChange('integrity');
    const actionFileType = settingsAction.fileType;
    // Only set specific checkboxes if a fileType is provided; otherwise keep default (both true)
    if (actionFileType) {
      setSelectedFileTypes({ "3mf": actionFileType === "3mf", "stl": actionFileType === "stl" });
    }

  (async () => {
      try {
        if (settingsAction.type === 'hash-check') {
          // Call the hash check with the explicit file type
          handleRunHashCheck(actionFileType);
        } else if (settingsAction.type === 'generate') {
          // Call the generate handler with the explicit file type
          await handleGenerateModelJson(actionFileType);
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
  const [renameCategoryIcon, setRenameCategoryIcon] = useState('Folder');
  // Add category state
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('Folder');
  // Delete confirmation dialog state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [pendingDeleteCount, setPendingDeleteCount] = useState(0);

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

  // File type selection state - both can be selected, both default to true
  const [selectedFileTypes, setSelectedFileTypes] = useState<{ "3mf": boolean; "stl": boolean }>({ "3mf": true, "stl": true });

  // Lazy load experimental tab component from separate file
  const ExperimentalTab = lazy(() => import('./settings/ExperimentalTab'));

  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement | null>(null);
  // Unsaved color state to avoid auto-saving when user picks a color
  const [unsavedDefaultModelColor, setUnsavedDefaultModelColor] = useState<string>(() => {
    return (localConfig as any)?.settings?.defaultModelColor ?? '#aaaaaa';
  });
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
  // Collections restore behavior for backups that include collections.json
  const [collectionsRestoreStrategy, setCollectionsRestoreStrategy] = useState<'merge' | 'replace'>('merge');

  // State and handler for generating model JSONs via backend API
  const [isGeneratingJson, setIsGeneratingJson] = useState(false);
  const [generateResult, setGenerateResult] = useState<{ skipped?: number; generated?: number; verified?: number; processed?: number } | null>(null);
  
  const handleGenerateModelJson = async (fileType?: "3mf" | "stl") => {
    // Determine which file types to process
    const fileTypesToProcess: Array<"3mf" | "stl"> = fileType 
      ? [fileType] 
      : [...(selectedFileTypes["3mf"] ? ["3mf" as const] : []), ...(selectedFileTypes["stl"] ? ["stl" as const] : [])];
    
    if (fileTypesToProcess.length === 0) return;
    
    // Clear any previous hash-check results so UI doesn't show stale verified counts
    if (hashCheckResult) setHashCheckResult(null);
    setIsGeneratingJson(true);
    // Clear previous generation result so UI shows fresh status while running
    setGenerateResult(null);
    
    try {
      let totalProcessed = 0;
      let totalSkipped = 0;
      let totalGenerated = 0;
      let totalVerified = 0;
      
      // Process each selected file type sequentially
      for (const effectiveFileType of fileTypesToProcess) {
        const fileTypeText = effectiveFileType === "3mf" ? ".3mf" : ".stl";
        setStatusMessage(`Generating JSON for all ${fileTypeText} files...`);
        
        const resp = await fetch('/api/scan-models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileType: effectiveFileType })
        });

        if (!resp.ok) {
          const errBody = await resp.text().catch(() => '');
          throw new Error(`Scan failed for ${fileTypeText}: ${resp.status} ${errBody}`);
        }

        // Read final JSON summary from the server
        const data = await resp.json().catch(() => ({} as any));
        if (!data || (data.success === false)) {
          throw new Error(data?.error || `Scan failed for ${fileTypeText}`);
        }

        // Accumulate counts from each file type
        totalProcessed += typeof data.processed === 'number' ? data.processed : 0;
        totalSkipped += typeof data.skipped === 'number' ? data.skipped : 0;
        totalGenerated += typeof data.generated === 'number' ? data.generated : 0;
        totalVerified += typeof data.verified === 'number' ? data.verified : 0;
      }
      
      // Populate generateResult with accumulated counts
      setGenerateResult({
        processed: totalProcessed > 0 ? totalProcessed : undefined,
        skipped: totalSkipped > 0 ? totalSkipped : undefined,
        generated: totalGenerated > 0 ? totalGenerated : undefined,
        verified: totalVerified > 0 ? totalVerified : undefined,
      });

      setSaveStatus('saved');
      setStatusMessage('Generation complete.');
      setTimeout(() => { setSaveStatus('idle'); setStatusMessage(''); }, 3000);
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

  const handleConfirmAddCategory = async (label: string, icon: string) => {
    label = label.trim();
    if (!label) return;

    setSaveStatus('saving');
    setStatusMessage(`Adding category "${label}"...`);

    // Generate ID: lowercase, words separated by hyphens, strip special chars
    let baseId = label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // remove non-alphanumeric except spaces
      .trim()
    .replace(/\s+/g, '_');
    let uniqueId = baseId;
    let counter = 1;
    while (localCategories.some(c => c.id === uniqueId)) {
      uniqueId = `${baseId}-${counter}`;
      counter++;
    }

    // Prevent duplicate labels (case-insensitive)
    if (localCategories.some(c => c.label.toLowerCase() === label.toLowerCase())) {
      setSaveStatus('error');
      setStatusMessage(`A category with the label "${label}" already exists.`);
      setTimeout(() => { setSaveStatus('idle'); setStatusMessage(''); }, 3000);
      return;
    }

  const normalizedIcon = normalizeIconName(icon || 'Folder');
  const newCat: Category = { id: uniqueId, label, icon: normalizedIcon } as Category;
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
      setNewCategoryIcon('Folder');
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

  // Helper: attempt to turn a user-provided icon name into a PascalCase Lucide export name
  const normalizeIconName = (input?: string) => {
    if (!input) return 'Folder';
    const cleaned = input.trim().replace(/\.(svg|js|tsx?)$/i, '').replace(/[^a-z0-9-_ ]/gi, '');
    if (!cleaned) return 'Folder';
    const parts = cleaned.split(/[-_\s]+/).filter(Boolean);
    const pascal = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
    return pascal || 'Folder';
  };

  const getLucideIconComponent = (iconName?: string) => {
    const name = normalizeIconName(iconName);
    const Comp = (LucideIcons as any)[name] as React.ComponentType<any> | undefined;
    if (Comp) return Comp;
    return (LucideIcons as any)['Folder'] as React.ComponentType<any>;
  };

  const iconExists = (iconName?: string) => {
    const name = normalizeIconName(iconName);
    return !!(LucideIcons as any)[name];
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
  const handleRenameCategory = async (oldCategoryId: string, newCategoryId: string, newCategoryLabel: string, icon?: string) => {
    if (!newCategoryId.trim() || !newCategoryLabel.trim()) return;

    const newIdTrimmed = newCategoryId.trim();
    const newLabelTrimmed = newCategoryLabel.trim();

    // If id or label conflicts with another category (not the one we're renaming), block the change
    const conflicting = localCategories.find(c => (c.id === newIdTrimmed || c.label.toLowerCase() === newLabelTrimmed.toLowerCase()) && c.id !== oldCategoryId);
    if (conflicting) {
      setSaveStatus('error');
      setStatusMessage(`A category with the same ${conflicting.id === newIdTrimmed ? 'id' : 'label'} already exists.`);
      setTimeout(() => { setSaveStatus('idle'); setStatusMessage(''); }, 3000);
      return;
    }

  setSaveStatus('saving');
  setStatusMessage(`Renaming category "${oldCategoryId}" to "${newIdTrimmed}"...`);
    
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
    const normalizedNewIcon = normalizeIconName(icon ?? renameCategoryIcon);
    const updatedCategories = localCategories.map(cat => 
      cat.id === oldCategoryId 
        ? { ...cat, id: newIdTrimmed, label: newLabelTrimmed, icon: normalizedNewIcon }
        : cat
    );

    // Update all models that use this category (by label, not ID)
    const updatedModels = models.map(model => ({
      ...model,
      category: model.category === oldCategoryLabel ? newLabelTrimmed : model.category
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
    setRenameCategoryIcon(category.icon || 'Folder');
    setIsCategoryRenameDialogOpen(true);
  };

  // Delete category and update all models that used it
  const handleDeleteCategory = async (categoryId: string) => {
    const cat = localCategories.find(c => c.id === categoryId);
    if (!cat) return;

  // This function is now called after user confirms in the dialog

    setSaveStatus('saving');
    setStatusMessage(`Deleting category "${cat.label}"...`);

    // Remove category from localCategories
    const updatedCategories = localCategories.filter(c => c.id !== categoryId);

  // Update models: set category to 'Uncategorized' where it matched the deleted category label
  const updatedModels = models.map(m => ({ ...m, category: m.category === cat.label ? 'Uncategorized' : m.category }));

    // Save each affected model to its JSON file
    let saveErrors = 0;
    for (const model of updatedModels) {
      const original = models.find(x => x.id === model.id);
      if (!original) continue;
      if (original.category !== model.category) {
        try {
          let filePath: string | undefined;
          if (model.modelUrl) {
            const threeMfPath = model.modelUrl.replace(/^\/models\//, '');
            filePath = threeMfPath.replace(/\.3mf$/i, '-munchie.json');
          } else if (model.filePath) {
            filePath = model.filePath.replace(/\.3mf$/i, '-munchie.json');
          }
          if (!filePath) {
            console.error('No file path for model while deleting category:', model.name);
            saveErrors++;
            continue;
          }

          const requestData = {
            filePath,
            id: model.id,
            category: model.category
          };

          const resp = await fetch('/api/save-model', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
          });
          const result = await resp.json();
          if (!result.success) {
            console.error('Failed to save model after category delete:', model.name, result.error);
            saveErrors++;
          }
        } catch (err) {
          console.error('Error saving model after category delete:', model.name, err);
          saveErrors++;
        }
      }
    }

    // Update UI state and persist config
    setLocalCategories(updatedCategories);
    const updatedConfig = { ...localConfig, categories: updatedCategories };
    try {
      await handleSaveConfig(updatedConfig);
    } catch (err) {
      console.warn('Failed to save config after category delete:', err);
    }

    onCategoriesUpdate(updatedCategories);
    onModelsUpdate(updatedModels);
    setIsCategoryRenameDialogOpen(false);
    setSelectedCategory(null);

    if (saveErrors === 0) {
      setSaveStatus('saved');
      setStatusMessage(`Category "${cat.label}" deleted and models updated`);
    } else {
      setSaveStatus('error');
      setStatusMessage(`Category deleted but ${saveErrors} model save(s) failed`);
    }

    setTimeout(() => {
      setSaveStatus('idle');
      setStatusMessage('');
    }, 3000);
  };

  // Open the delete confirmation dialog and compute affected models
  const openDeleteConfirm = (categoryId: string) => {
    const cat = localCategories.find(c => c.id === categoryId);
    if (!cat) return;
    const count = models.reduce((acc, m) => acc + (m.category === cat.label ? 1 : 0), 0);
    setPendingDeleteCount(count);
    setIsDeleteConfirmOpen(true);
  };

  // Run scanModelFile for all models, update models, and produce a HashCheckResult for UI compatibility
  const handleRunHashCheck = async (fileType?: "3mf" | "stl") => {
    // Determine which file types to process
    const fileTypesToProcess: Array<"3mf" | "stl"> = fileType 
      ? [fileType] 
      : [...(selectedFileTypes["3mf"] ? ["3mf" as const] : []), ...(selectedFileTypes["stl"] ? ["stl" as const] : [])];
    
    if (fileTypesToProcess.length === 0) return;
    
    // Clear any previous generate or duplicate results so the UI doesn't show stale counts
    if (generateResult) setGenerateResult(null);
    setDuplicateGroups([]);
    setHashCheckResult(null);
    setIsHashChecking(true);
    setHashCheckProgress(0);
    
    try {
      let allVerified = 0;
      let allCorrupted = 0;
      const allCorruptedFiles: CorruptedFile[] = [];
      const allDuplicateGroups: DuplicateGroup[] = [];
      const allHashToModels: Record<string, Model[]> = {};
      const allUpdatedModels: Model[] = [];
      const usedIds = new Set<string>(); // Track used IDs across both runs
      
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
        category: 'Utility',
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
        filePath: ''
      };
      
      // Process each selected file type sequentially
      for (const effectiveFileType of fileTypesToProcess) {
        const fileTypeText = effectiveFileType === "3mf" ? ".3mf" : ".stl";
        setStatusMessage(`Rescanning ${fileTypeText} files and comparing hashes...`);
        
        const resp = await fetch('/api/hash-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileType: effectiveFileType })
        });
        
        const data = await resp.json();
        if (!data.success) throw new Error(data.error || `Hash check failed for ${fileTypeText}`);
        
        // Map backend results and accumulate
        allVerified += typeof data.verified === 'number' ? data.verified : 0;
        
        for (const r of data.results) {
        // Try to find the full model in the current models array for images/thumbnails
        const fullModel = models.find(m => {
          // Try multiple matching strategies with case-insensitive comparison for file systems like Windows/macOS
          if (m.name === r.baseName) return true;
          
          // Normalize paths: convert backslashes to forward slashes and lowercase for comparison
          const normalizedModelUrl = m.modelUrl.replace(/\\/g, '/').toLowerCase();
          const file3mf = r.threeMF ? r.threeMF.replace(/\\/g, '/').toLowerCase() : null;
          const fileStl = r.stl ? r.stl.replace(/\\/g, '/').toLowerCase() : null;
          
          // Try endsWith match (handles subdirectories)
          if (file3mf && normalizedModelUrl.endsWith(file3mf)) return true;
          if (fileStl && normalizedModelUrl.endsWith(fileStl)) return true;
          
          // Try with /models/ prefix
          if (file3mf && normalizedModelUrl === `/models/${file3mf}`) return true;
          if (fileStl && normalizedModelUrl === `/models/${fileStl}`) return true;
          
          // Try comparing just the filename (case-insensitive)
          const modelFileName = m.modelUrl?.split(/[/\\]/).pop()?.toLowerCase();
          const hashFileName = (r.threeMF?.split(/[/\\]/).pop() || r.stl?.split(/[/\\]/).pop())?.toLowerCase();
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
            allVerified++;
          } else {
            allCorrupted++;
            const filePath = r.threeMF ? `/models/${r.threeMF}` : r.stl ? `/models/${r.stl}` : '';
            allCorruptedFiles.push({
              model: mergedModel,
              filePath: filePath,
              error: r.details || 'Unknown error',
              actualHash: r.hash || 'UNKNOWN',
              expectedHash: r.storedHash || 'UNKNOWN'
            });
          }
          if (r.hash) {
            if (!allHashToModels[r.hash]) allHashToModels[r.hash] = [];
            allHashToModels[r.hash].push(mergedModel);
          }
          allUpdatedModels.push(mergedModel);
        }
      }
      
      // Find duplicate groups across all file types
      for (const hash in allHashToModels) {
        if (allHashToModels[hash].length > 1) {
          allDuplicateGroups.push({ hash, models: allHashToModels[hash], totalSize: '0' });
        }
      }
      
      setDuplicateGroups(allDuplicateGroups);
      setHashCheckResult({
        verified: allVerified,
        corrupted: allCorrupted,
        duplicateGroups: allDuplicateGroups,
        corruptedFiles: allCorruptedFiles,
        corruptedFileDetails: allCorruptedFiles,
        lastCheck: new Date().toISOString()
      });
      onModelsUpdate(allUpdatedModels);
      setSaveStatus('saved');
      setStatusMessage('Hash check complete. See results.');
      setTimeout(() => {
        setSaveStatus('idle');
        setStatusMessage('');
      }, 4000);
    } catch (error) {
      setSaveStatus('error');
      setStatusMessage('Model scan failed');
      console.error('Model scan error:', error);
    } finally {
      setIsHashChecking(false);
      setHashCheckProgress(0);
    }
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
      // Also update the hash check result so the UI section that renders
      // `hashCheckResult.duplicateGroups` hides this group immediately.
      setHashCheckResult(prev => prev ? { ...prev, duplicateGroups: updatedGroups } : prev);
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

  // Regenerate munchie.json for a single model id and refresh the hash check
  const handleRegenerate = async (model: any) => {
    if (!model) {
      toast.error('Cannot regenerate: missing model information');
      return;
    }

    // Prefer model id when present; otherwise allow passing a relative filePath
    const hasId = typeof model.id === 'string' && model.id.trim().length > 0;
    const hasFilePath = typeof model.filePath === 'string' && model.filePath.trim().length > 0;

    if (!hasId && !hasFilePath) {
      toast.error('Cannot regenerate: missing model id or filePath');
      return;
    }

    try {
      setSaveStatus('saving');
      setStatusMessage('Regenerating munchie.json...');

      const body: any = {};
      if (hasId) body.modelIds = [model.id];
      else {
        // Normalize filePath to be relative to /models (strip leading /models/ if present)
        let rel = model.filePath.replace(/^\/?models\//, '').replace(/\\/g, '/');
        body.filePaths = [rel];
      }

      const resp = await fetch('/api/regenerate-munchie-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await resp.json().catch(() => ({} as any));

      if (!resp.ok || data.success === false) {
        const errMsg = data && data.error ? data.error : (Array.isArray(data.errors) ? data.errors.map((e: any) => e.error || JSON.stringify(e)).join('; ') : 'Regeneration failed');
        throw new Error(errMsg);
      }

      // If server returned errors array, show them as warnings
      if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        const msgs = data.errors.map((e: any) => e.error || JSON.stringify(e)).join('; ');
        toast.error(`Regeneration completed with errors: ${msgs}`);
      } else {
        toast.success('Regenerated munchie data');
      }

      // Re-run the hash check to refresh UI with the first selected file type
      const firstSelectedType = selectedFileTypes["3mf"] ? "3mf" : "stl";
      handleRunHashCheck(firstSelectedType);
    } catch (e: any) {
      console.error('Regenerate error:', e);
      toast.error(e?.message || 'Failed to regenerate munchie file');
    } finally {
      setSaveStatus('idle');
      setStatusMessage('');
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

        // Include collections strategy in upload restore
        formData.append('collectionsStrategy', collectionsRestoreStrategy);
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
            strategy: restoreStrategy,
            collectionsStrategy: collectionsRestoreStrategy
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
    <div className="h-full bg-background" data-testid="settings-page">
      {/* Main Content Area - sidebar is now in App.tsx */}
      <div className="h-full overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4 pb-6 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="p-2"
                data-testid="back-button"
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

            {/* Tab Content */}
            {selectedTab === 'general' && (
              <GeneralTab
                config={localConfig}
                onConfigFieldChange={handleConfigFieldChange}
                onSaveConfig={handleSaveConfig}
                onLoadServerConfig={handleLoadServerConfig}
              />
            )}

            {/* Categories Tab */}
            {selectedTab === 'categories' && (
              <CategoriesTab
                categories={localCategories}
                models={models}
                onCategoriesUpdate={setLocalCategories}
                onSaveCategories={handleSaveCategories}
                onRenameCategory={handleRenameCategory}
                onDeleteCategory={handleDeleteCategory}
                onAddCategory={handleConfirmAddCategory}
                categorySortOrder={localConfig.settings?.categorySortOrder ?? 'custom'}
                onCategorySortOrderChange={(order) => {
                  const updatedConfig = {
                    ...localConfig,
                    settings: { ...localConfig.settings, categorySortOrder: order }
                  };
                  setLocalConfig(updatedConfig);
                  onConfigUpdate?.(updatedConfig);
                  handleSaveConfig(updatedConfig);
                }}
              />
            )}

            {/* Tags Tab */}
            {selectedTab === 'tags' && (
              <TagsTab
                models={models}
                onRenameTag={handleRenameTag}
                onDeleteTag={handleDeleteTag}
                onViewTagModels={handleViewTagModels}
              />
            )}

            {/* Backup Tab */}
            {selectedTab === 'backup' && (
              <BackupTab
                models={models}
                onCreateBackup={handleCreateBackup}
                onRestoreFromFile={handleRestoreFromFile}
              />
            )}

            {/* Integrity Tab */}
            {selectedTab === 'integrity' && (
              <IntegrityTab
                models={models}
                hashCheckResult={hashCheckResult}
                isHashChecking={isHashChecking}
                hashCheckProgress={hashCheckProgress}
                generateResult={generateResult}
                isGeneratingJson={isGeneratingJson}
                selectedFileTypes={selectedFileTypes}
                onFileTypeChange={(fileType, checked) => setSelectedFileTypes(prev => ({ ...prev, [fileType]: checked }))}
                onRunHashCheck={() => handleRunHashCheck()}
                onGenerateModelJson={() => handleGenerateModelJson()}
                onRegenerate={handleRegenerate}
              />
            )}

            {/* Support Tab */}
            {selectedTab === 'support' && (
              <SupportTab onDonationClick={onDonationClick} />
            )}

            {/* Config Tab */}
            {selectedTab === 'config' && (
              <ConfigTab
                onExportConfig={handleExportConfig}
                onImportConfig={handleImportConfig}
                onResetConfig={handleResetConfig}
                onSaveConfig={() => handleSaveConfig()}
                onLoadServerConfig={handleLoadServerConfig}
              />
            )}

            {/* Experimental Tab (lazy loaded from separate file) */}
            {selectedTab === 'experimental' && (
              <Suspense fallback={<div>Loading experimental features...</div>}>
                <ExperimentalTab categories={localCategories} />
              </Suspense>
            )}

          </div>
        </ScrollArea>
      </div>

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        accept=".json"
        style={{ display: 'none' }}
      />
      
      <input
        type="file"
        ref={backupFileInputRef}
        onChange={handleBackupFileRestore}
        accept=".gz,.json"
        style={{ display: 'none' }}
      />

      {/* Tag Models View Dialog */}
      <Dialog open={!!viewTagModels} onOpenChange={() => setViewTagModels(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Models with tag: "{viewTagModels?.name}"</DialogTitle>
            <DialogDescription>
              {viewTagModels?.count} model{viewTagModels?.count !== 1 ? 's' : ''} found
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-96 w-full">
            <div className="p-2">
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
                  <ImageWithFallback
                    src={resolveModelThumbnail(model)}
                    alt={model.name}
                    className="w-12 h-12 object-cover rounded border"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{model.name}</p>
                    <div className="flex flex-col text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {model.category}
                        </Badge>
                      </div>
                      <div>
                        <span className={model.isPrinted ? 'text-green-600' : 'text-yellow-600'}>
                          {model.isPrinted ? 'Printed' : 'Not Printed'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>


    </div>
  );
}
