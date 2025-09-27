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
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { ScrollArea } from "./ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Progress } from "./ui/progress";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import * as LucideIcons from 'lucide-react';
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
  // Switch to integrity tab and capture fileType to avoid async state races
  setSelectedTab('integrity');
    const actionFileType = settingsAction.fileType;
    setSelectedFileType(actionFileType);

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

  // File type selection state - "3mf" or "stl" only
  const [selectedFileType, setSelectedFileType] = useState<"3mf" | "stl">("3mf");

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

  // State and handler for generating model JSONs via backend API
  const [isGeneratingJson, setIsGeneratingJson] = useState(false);
  const [generateResult, setGenerateResult] = useState<{ skipped?: number; generated?: number; verified?: number; processed?: number } | null>(null);
  
  const handleGenerateModelJson = async (fileType?: "3mf" | "stl") => {
    const effectiveFileType = fileType || selectedFileType;
    // Clear any previous hash-check results so UI doesn't show stale verified counts
    if (hashCheckResult) setHashCheckResult(null);
    setIsGeneratingJson(true);
    // Clear previous generation result so UI shows fresh status while running
    setGenerateResult(null);
    const fileTypeText = effectiveFileType === "3mf" ? ".3mf" : ".stl";
    setStatusMessage(`Generating JSON for all ${fileTypeText} files...`);
    try {
      // Request streaming progress from backend
      setIsGeneratingJson(true);

      const resp = await fetch('/api/scan-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileType: effectiveFileType })
      });

      if (!resp.ok) {
        const errBody = await resp.text().catch(() => '');
        throw new Error(`Scan failed: ${resp.status} ${errBody}`);
      }

      // Read final JSON summary from the server
      const data = await resp.json().catch(() => ({} as any));
      if (!data || (data.success === false)) {
        throw new Error(data?.error || 'Scan failed');
      }

      // Populate generateResult with any counts the server provided
      setGenerateResult({
        processed: typeof data.processed === 'number' ? data.processed : undefined,
        skipped: typeof data.skipped === 'number' ? data.skipped : undefined,
        generated: typeof data.generated === 'number' ? data.generated : undefined,
        verified: typeof data.verified === 'number' ? data.verified : undefined,
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

  const handleConfirmAddCategory = async () => {
    const label = newCategoryLabel.trim();
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

  const normalizedIcon = normalizeIconName(newCategoryIcon || 'Folder');
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
  const handleRenameCategory = async (oldCategoryId: string, newCategoryId: string, newCategoryLabel: string) => {
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
    const normalizedNewIcon = normalizeIconName(renameCategoryIcon);
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
  const handleRunHashCheck = (fileType?: "3mf" | "stl") => {
    // Clear any previous generate or duplicate results so the UI doesn't show stale counts
    if (generateResult) setGenerateResult(null);
    setDuplicateGroups([]);
    setHashCheckResult(null);
    setIsHashChecking(true);
    setHashCheckProgress(0);
    const effectiveFileType = fileType || selectedFileType;
    const fileTypeText = effectiveFileType === "3mf" ? ".3mf" : ".stl";
    setStatusMessage(`Rescanning ${fileTypeText} files and comparing hashes...`);
    fetch('/api/hash-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileType: effectiveFileType })
    })
      .then(resp => resp.json())
      .then(data => {
      if (!data.success) throw new Error(data.error || 'Hash check failed');
      // Map backend results to hash check result
      // Backend may include an overall verified count; prefer it if present
      let verified = typeof data.verified === 'number' ? data.verified : 0;
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

      // Re-run the hash check to refresh UI
      handleRunHashCheck(selectedFileType);
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
              <TabsTrigger value="experimental" className="flex-shrink-0">Experimental</TabsTrigger>
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

                    <div className="space-y-2">
                      <Label>Model Card Fields</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Primary Field</Label>
                          <Select
                            value={localConfig.settings.modelCardPrimary}
                            onValueChange={(value: string) => handleConfigFieldChange('settings.modelCardPrimary', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{getLabel('none')}</SelectItem>
                              <SelectItem value="printTime">{getLabel('printTime')}</SelectItem>
                              <SelectItem value="filamentUsed">{getLabel('filamentUsed')}</SelectItem>
                              <SelectItem value="fileSize">{getLabel('fileSize')}</SelectItem>
                              <SelectItem value="category">{getLabel('category')}</SelectItem>
                              <SelectItem value="designer">{getLabel('designer')}</SelectItem>
                              <SelectItem value="layerHeight">{getLabel('layerHeight')}</SelectItem>
                              <SelectItem value="nozzle">{getLabel('nozzle')}</SelectItem>
                              <SelectItem value="price">{getLabel('price')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs">Secondary Field</Label>
                          <Select
                            value={localConfig.settings.modelCardSecondary}
                            onValueChange={(value: string) => handleConfigFieldChange('settings.modelCardSecondary', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{getLabel('none')}</SelectItem>
                              <SelectItem value="printTime">{getLabel('printTime')}</SelectItem>
                              <SelectItem value="filamentUsed">{getLabel('filamentUsed')}</SelectItem>
                              <SelectItem value="fileSize">{getLabel('fileSize')}</SelectItem>
                              <SelectItem value="category">{getLabel('category')}</SelectItem>
                              <SelectItem value="designer">{getLabel('designer')}</SelectItem>
                              <SelectItem value="layerHeight">{getLabel('layerHeight')}</SelectItem>
                              <SelectItem value="nozzle">{getLabel('nozzle')}</SelectItem>
                              <SelectItem value="price">{getLabel('price')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground">Select which two properties (if any) are shown under the model name in the cards.</p>
                    </div>

                    <div className="space-y-2 mt-4">
                      <Label htmlFor="hide-printed-badge">Hide printed badge</Label>
                      <div className="flex items-center gap-3">
                        <Switch
                          id="hide-printed-badge"
                          // The switch represents "hide" so invert the stored showPrintedBadge value
                          checked={!localConfig.settings.showPrintedBadge}
                          onCheckedChange={(v) => handleConfigFieldChange('settings.showPrintedBadge', !Boolean(v))}
                        />
                        <p className="text-xs text-muted-foreground">Toggle to hide the Printed badge on model cards and list views.</p>
                      </div>
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
                            {LICENSES.map((lic) => (
                              <SelectItem key={lic} value={lic}>{lic}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>                  
                  <Separator />

                  {/* Image generation */}
                  <div className="space-y-4">
                    <h3 className="font-medium">3D Model Viewer</h3>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col">
                        <Label className="text-xs mb-2">Default Model Color</Label>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <input
                                ref={colorInputRef}
                                type="color"
                                value={unsavedDefaultModelColor ?? '#aaaaaa'}
                                onChange={(e: any) => setUnsavedDefaultModelColor(e.target.value)}
                                title="Default model color"
                                aria-label="Default model color picker"
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  width: 40,
                                  height: 40,
                                  padding: 0,
                                  margin: 0,
                                  opacity: 0,
                                  border: 'none',
                                  background: 'transparent',
                                  cursor: 'pointer'
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => colorInputRef.current?.click()}
                                className="w-10 h-10 rounded-full border border-border shadow-sm flex items-center justify-center"
                                title="Pick default model color"
                                aria-hidden="true"
                                style={{ background: unsavedDefaultModelColor || '#aaaaaa' }}
                              />
                            </div>
                            <div className="text-sm font-mono text-xs">{(unsavedDefaultModelColor || '#aaaaaa').toUpperCase()}</div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                // Save the picked color into the config
                                handleConfigFieldChange('settings.defaultModelColor', unsavedDefaultModelColor || '#aaaaaa');
                                toast.success('Default model color saved');
                              }}
                              title="Save color"
                            >
                              Save
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // Revert the unsaved color to the default, but do not persist
                                const defaultColor = ConfigManager.getDefaultConfig().settings.defaultModelColor || '#aaaaaa';
                                setUnsavedDefaultModelColor(defaultColor);
                              }}
                              title="Reset color"
                            >
                              Reset
                            </Button>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground mt-2">
                          Pick the default color used by the 3D model viewer when a model does not provide a color.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="model-dir">Model Directory</Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            id="model-dir"
                            className="flex-1"
                            value={isEditingModelDir ? tempModelDir : localConfig.settings.modelDirectory}
                            readOnly={!isEditingModelDir}
                            placeholder="./models"
                            onChange={(e: any) => { if (isEditingModelDir) setTempModelDir(e.target.value); }}
                          />
                          {!isEditingModelDir ? (
                            <Button
                              onClick={() => {
                                setTempModelDir(localConfig.settings.modelDirectory || './models');
                                setIsEditingModelDir(true);
                              }}
                              title="Edit model directory"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                onClick={async () => {
                                  try {
                                    setSaveStatus('saving');
                                    const newConfig = { ...localConfig, settings: { ...localConfig.settings, modelDirectory: tempModelDir } } as AppConfig;
                                    const resp = await fetch('/api/save-config', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify(newConfig)
                                    });
                                    if (!resp.ok) {
                                      const txt = await resp.text().catch(() => '');
                                      throw new Error(`Save failed: ${resp.status} ${txt}`);
                                    }
                                    const body = await resp.json().catch(() => null);
                                    if (!body || body.success === false) throw new Error(body?.error || 'Unknown error');
                                    // Update local config with server-supplied final config when available
                                    const updated = body.config || newConfig;
                                    setLocalConfig(updated);
                                    onConfigUpdate?.(updated);
                                    setSaveStatus('saved');
                                    toast.success('Model directory saved. The server will serve files from the new location.');
                                    setIsEditingModelDir(false);
                                    // ensure temp cleaned
                                    setTempModelDir('');
                                  } catch (err: any) {
                                    console.error('Failed to save model directory:', err);
                                    setSaveStatus('error');
                                    toast.error('Failed to save model directory: ' + (err?.message || ''));
                                  } finally {
                                    setTimeout(() => setSaveStatus('idle'), 2500);
                                  }
                                }}
                              >
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
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
                        <div className="flex items-center gap-2">
                          {(() => {
                            const IconComp = getLucideIconComponent(category.icon);
                            return <IconComp className="h-4 w-4 text-muted-foreground" />;
                          })()}
                          <Badge variant="outline" className="font-medium">
                            {category.label}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          <span className="text-sm text-muted-foreground hidden sm:inline">
                            ID: {category.id}
                          </span>
                        </span>
                        <div className="flex items-center gap-2 ml-auto">
                          <span className="text-sm text-muted-foreground hidden sm:inline">
                            Used in {models.reduce((acc, m) => acc + (m.category === category.label ? 1 : 0), 0)} model{models.reduce((acc, m) => acc + (m.category === category.label ? 1 : 0), 0) !== 1 ? 's' : ''}
                          </span>
                          {!(category.id === 'uncategorized' || category.label === 'Uncategorized') && (
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
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Unmapped categories found in munchie.json files */}
                  {unmappedCategories.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Unmapped Categories</h4>
                      <p className="text-xs text-muted-foreground">Categories discovered in model metadata that are not defined in your configuration. You can add them as configured categories.</p>
                      <div className="space-y-2 mt-2">
                        {unmappedCategories.map((uc) => (
                          <div key={uc.label} className="flex items-center gap-3 p-3 bg-muted/60 rounded-lg border border-border">
                            <div className="flex items-center gap-2">
                              <Box className="h-4 w-4 text-muted-foreground" />
                              <Badge variant="outline" className="font-medium">{uc.label}</Badge>
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                              <span className="text-sm text-muted-foreground hidden sm:inline">Used in {uc.count} model{uc.count !== 1 ? 's' : ''}</span>
                              <Button size="sm" variant="ghost" onClick={() => {
                                // Add this unmapped label as a new configured category using a generated id
                                const newId = uc.label.trim().toLowerCase().replace(/\s+/g, '_');
                                const normalizedIcon = normalizeIconName('Folder');
                                const newCat: Category = { id: newId, label: uc.label.trim(), icon: normalizedIcon } as Category;
                                const exists = localCategories.find(c => c.label.toLowerCase() === newCat.label.toLowerCase() || c.id === newCat.id);
                                if (exists) {
                                  setStatusMessage(`Category "${uc.label}" already exists`);
                                  setTimeout(() => setStatusMessage(''), 2500);
                                  return;
                                }
                                const updated = [...localCategories, newCat];
                                setLocalCategories(updated);
                                const updatedConfig: AppConfig = { ...localConfig, categories: updated };
                                // Persist config
                                handleSaveConfig(updatedConfig).then(() => {
                                  onCategoriesUpdate(updated);
                                  onConfigUpdate?.(updatedConfig);
                                  setStatusMessage(`Added category "${uc.label}"`);
                                  setTimeout(() => setStatusMessage(''), 2500);
                                }).catch(err => {
                                  console.error('Failed to add category from unmapped list', err);
                                  setStatusMessage('Failed to add category');
                                  setTimeout(() => setStatusMessage(''), 2500);
                                });
                              }} className="gap-2">
                                <Plus className="h-4 w-4" />
                                Add
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
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
                        ref={tagInputRef}
                        className="pl-10 pr-10"
                      />
                      {tagSearchTerm && (
                        <button
                          type="button"
                          onClick={() => { setTagSearchTerm(''); try { tagInputRef.current?.focus(); } catch (e) {} }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                          aria-label="Clear search"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tags List */}
                  <ScrollArea className="max-h-96 w-full">
                    <div className="space-y-2 p-2 max-h-80">
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
                  </ScrollArea>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      
                      {/* <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            <div>
                              <p className="text-lg font-semibold">{backupHistory.length}</p>
                              <p className="text-xs text-muted-foreground">Backups Created</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card> */}
                      
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
                  <div className="flex flex-col items-start gap-4">
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
                          onClick={() => handleRunHashCheck()}
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
                          onClick={() => handleGenerateModelJson()}
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
                      <div className="flex flex-wrap gap-4 mt-3 w-full">
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
                        {generateResult && (() => {
                          // Compute once
                          const processedNum = typeof generateResult.processed === 'number'
                            ? generateResult.processed
                            : (generateResult.generated || 0) + (generateResult.verified || 0);
                          const skippedNum = generateResult.skipped || 0;
                          const totalSeen = processedNum + skippedNum;

                          // Prefer explicit `generated`; otherwise treat `processed` as generated for display
                          const hasExplicitGenerated = typeof generateResult.generated === 'number';
                          const showAsGenerated = hasExplicitGenerated || (typeof generateResult.generated === 'undefined' && processedNum > 0);

                          // Show separate 'generated' only when it differs from processed
                          const showGeneratedSeparate = hasExplicitGenerated && (generateResult.generated !== processedNum);

                          return (
                            <>
                              {totalSeen > 0 && (
                                <div key="gen-total-status" className="flex items-center gap-2">
                                  <BarChart3 className="h-4 w-4 text-primary" />
                                  <span className="text-sm">{totalSeen} total</span>
                                </div>
                              )}

                              {processedNum > 0 && (
                                <div key="gen-processed-status" className="flex items-center gap-2">
                                  <FileCheck className={`h-4 w-4 ${showAsGenerated ? 'text-green-600' : 'text-blue-600'}`} />
                                  <span className="text-sm">{processedNum} {showAsGenerated ? 'generated' : 'processed'}</span>
                                </div>
                              )}

                              {(skippedNum > 0) && (
                                <div key="gen-skipped-count" className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-gray-600" />
                                  <span className="text-sm">{skippedNum} skipped</span>
                                </div>
                              )}

                              {showGeneratedSeparate && (
                                <div key="gen-generated-count" className="flex items-center gap-2">
                                  <HardDrive className="h-4 w-4 text-green-600" />
                                  <span className="text-sm text-green-600">{generateResult.generated || 0} generated</span>
                                </div>
                              )}

                              {((generateResult.verified || 0) > 0) && (
                                <div key="gen-verified-count" className="flex items-center gap-2">
                                  <FileCheck className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm">{generateResult.verified || 0} verified</span>
                                </div>
                              )}
                            </>
                          );
                        })()}
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
                                    {file.error || (file.actualHash && file.expectedHash && file.actualHash !== file.expectedHash
                                      ? 'Hash mismatch: model file may have been updated and saved. Regenerate munchie.json to update metadata.'
                                      : 'Missing metadata or hash mismatch')}
                                  </p>
                                </div>
                                {file.actualHash && file.expectedHash && file.expectedHash !== 'UNKNOWN' && file.actualHash !== file.expectedHash && (
                                  <div className="mt-3 sm:mt-0 ml-0 sm:ml-4 shrink-0">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleRegenerate(model || { id: `regen-${(file.filePath || 'unknown').replace(/[^a-zA-Z0-9]/g, '-')}`, filePath: file.filePath } as any)}
                                    >
                                      Regenerate
                                    </Button>
                                  </div>
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
                                  <DialogContent className="w-full max-w-[72rem]">
                                    <DialogHeader>
                                      <DialogTitle>Remove Duplicate Files</DialogTitle>
                                      <DialogDescription>
                                        Choose which file to keep. All other copies will be deleted. <br/><strong className="text-destructive">This action cannot be undone.</strong>
                                      </DialogDescription>
                                    </DialogHeader>
                                    {/* Wrap list in an overflow-x-auto container so very long paths don't push the buttons out of view */}
                                    <div className="space-y-2 min-w-0">
                                      <ScrollArea className="w-full" showHorizontalScrollbar={true}>
                                        <div className="w-max">
                                          {group.models.map((model) => (
                                            <div key={`dup-dialog-${group.hash}-${model.id}-${model.name}`} className="flex items-center justify-between p-2 bg-muted rounded-md gap-2 mb-2">
                                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                                {(() => {
                                                  const src = resolveModelThumbnail(model);
                                                  if (src) {
                                                    return (
                                                      <ImageWithFallback
                                                        src={src}
                                                        alt={model.name}
                                                        className="w-8 h-8 object-cover rounded border flex-shrink-0"
                                                      />
                                                    );
                                                  }
                                                  return (
                                                    <div className="w-8 h-8 flex items-center justify-center bg-muted rounded border flex-shrink-0">
                                                      <Box className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                  );
                                                })()}
                                                <div className="ml-2 text-sm pr-4 min-w-0 w-full">
                                                  <div className="overflow-x-auto whitespace-nowrap">
                                                    <span className="select-all">{getDisplayPath(model)}</span>
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="flex-shrink-0 ml-4">
                                                <Button
                                                  variant="destructive"
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
                                            </div>
                                          ))}
                                        </div>
                                      </ScrollArea>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                              <div key={`models-${group.hash}`} className="space-y-2">
                                {group.models.map((model) => (
                                  <div key={`dup-list-${group.hash}-${model.id}-${model.name}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <ModelThumbnail model={model} name={model.name} />
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
                    <ImageWithFallback
                      src="/images/munchie-side.png"
                      alt="Community mascot"
                      className="w-72 sm:w-[200px] h-auto flex-shrink-0 mx-auto sm:mx-0"
                    />                    
                    <div className="flex-1 w-full flex flex-col justify-center space-y-3 text-left">
                      <h3 className="font-medium">Join the Community</h3>
                      <ul className="text-sm text-muted-foreground space-y-2 text-left list-disc list-inside">
                        <li>Share your 3D printing projects and experiences</li>
                        <li>Get help from fellow makers and developers</li>
                        <li>Suggest new features and improvements</li>
                        <li>Stay updated on the latest releases</li>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
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
            {/* Experimental Tab (lazy loaded from separate file) */}
            <TabsContent value="experimental" className="space-y-6">
              <Suspense fallback={<div>Loading experimental features...</div>}>
                <ExperimentalTab categories={localCategories} />
              </Suspense>
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
                  <div className="space-y-2">
                    <Label htmlFor="rename-category-icon">Icon (Lucide name)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="rename-category-icon"
                        value={renameCategoryIcon}
                        onChange={(e) => setRenameCategoryIcon(e.target.value)}
                        placeholder="e.g. tag, box, heart, alert-circle"
                      />
                      <div className="w-8 h-8 flex items-center justify-center bg-muted rounded border">
                        {(() => {
                          const IconPreview = getLucideIconComponent(renameCategoryIcon);
                          return <IconPreview className="h-4 w-4 text-muted-foreground" />;
                        })()}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      See available icons at <a href="https://lucide.dev/icons" target="_blank" rel="noopener noreferrer" className="text-primary underline">lucide.dev/icons</a>
                    </p>
                    {!iconExists(renameCategoryIcon) && (
                      <p className="text-xs text-red-600 mt-1">Icon not found — it will fall back to the Folder icon</p>
                    )}
                  </div>
              </div>
              <DialogFooter className="flex justify-between items-center">
                <div className="flex-1 flex justify-start">
                  <Button
                    variant="destructive"
                    onClick={() => selectedCategory && openDeleteConfirm(selectedCategory.id)}
                    disabled={!selectedCategory}
                  >
                    Delete
                  </Button>
                </div>
                <div className="flex-1 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCategoryRenameDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      if (selectedCategory && renameCategoryValue.trim()) {
                        const newId = renameCategoryValue.trim().toLowerCase().replace(/\s+/g, '_');
                        handleRenameCategory(selectedCategory.id, newId, renameCategoryValue.trim());
                      }
                    }}
                    disabled={
                      !renameCategoryValue.trim() || (
                        renameCategoryValue === selectedCategory?.label &&
                        normalizeIconName(renameCategoryIcon) === (selectedCategory?.icon || 'Folder')
                      )
                    }
                  >
                    Rename Category
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Delete Category</DialogTitle>
                <DialogDescription>
                  {pendingDeleteCount} model{pendingDeleteCount !== 1 ? 's' : ''} will be moved to "Uncategorized".
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">This action cannot be undone. Are you sure you want to delete this category?</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (selectedCategory) {
                      setIsDeleteConfirmOpen(false);
                      await handleDeleteCategory(selectedCategory.id);
                    }
                  }}
                >
                  Confirm Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Category Dialog */}
          <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
              <DialogContent>
                <form onSubmit={(e) => { e.preventDefault(); handleConfirmAddCategory(); }}>
                  <DialogHeader>
                    <DialogTitle>Add Category</DialogTitle>
                    <DialogDescription>
                      Create a new category. This will be saved to your configuration.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2 mt-4 mb-2">
                      <Label htmlFor="new-category">Category name</Label>
                      <Input
                        id="new-category"
                        value={newCategoryLabel}
                        onChange={(e) => setNewCategoryLabel(e.target.value)}
                        placeholder="Enter category name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-category-icon">Icon (Lucide name)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="new-category-icon"
                          value={newCategoryIcon}
                          onChange={(e) => setNewCategoryIcon(e.target.value)}
                          placeholder="e.g. tag, box, heart, alert-circle"
                        />
                        <div className="w-8 h-8 flex items-center justify-center bg-muted rounded border">
                          {(() => {
                            const IconPreview = getLucideIconComponent(newCategoryIcon);
                            return <IconPreview className="h-4 w-4 text-muted-foreground" />;
                          })()}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        See available icons at <a href="https://lucide.dev/icons" target="_blank" rel="noopener noreferrer" className="text-primary underline">lucide.dev/icons</a>
                      </p>
                      {!iconExists(newCategoryIcon) && (
                        <p className="text-xs text-red-600 mt-1">Icon not found — it will fall back to the Folder icon</p>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => setIsAddCategoryDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={!newCategoryLabel.trim()}>
                      Add Category
                    </Button>
                  </DialogFooter>
                </form>
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
      </ScrollArea>
    </div>
  );
}