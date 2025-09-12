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
import { 
  ArrowLeft, 
  GripVertical, 
  Download, 
  Upload, 
  RefreshCw, 
  Save, 
  FolderOpen,
  Settings as SettingsIcon,
  CheckCircle,
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
  RotateCcw
} from "lucide-react";

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
  // Helper function to get a clean file path for display
  const getDisplayPath = (model: Model) => {
    if (model.modelUrl) {
      // Remove /models/ prefix and show the relative path
      return model.modelUrl.replace(/^\/models\//, '');
    }
    return model.name || 'Unknown';
  };

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
  const [viewTagModels, setViewTagModels] = useState<TagInfo | null>(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renameTagValue, setRenameTagValue] = useState('');
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('general');

  // Category editing state
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isCategoryRenameDialogOpen, setIsCategoryRenameDialogOpen] = useState(false);
  const [renameCategoryValue, setRenameCategoryValue] = useState('');

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
          
          // Convert .3mf to -munchie.json if needed
          const munchieFileName = fileName.endsWith('-munchie.json')
            ? fileName
            : fileName.replace('.3mf', '-munchie.json');
          
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

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
  const handleGenerateModelJson = async () => {
    setIsGeneratingJson(true);
    setStatusMessage('Generating JSON for all .3mf files...');
    try {
      const response = await fetch('/api/scan-models', {
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
    setIsHashChecking(true);
    setHashCheckProgress(0);
    setStatusMessage('Rescanning .3mf files and comparing hashes...');
    fetch('/api/hash-check')
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
        const fullModel = models.find(m => {
          // Try multiple matching strategies
          if (m.name === r.baseName) return true;
          if (r.threeMF && m.modelUrl.endsWith(r.threeMF)) return true;
          // Try with /models/ prefix
          if (r.threeMF && m.modelUrl === `/models/${r.threeMF}`) return true;
          // Try comparing the full modelUrl path (handling backslashes)
          const expectedUrl = r.threeMF ? `/models/${r.threeMF}` : '';
          if (m.modelUrl === expectedUrl) return true;
          // Try normalizing paths - convert backslashes to forward slashes
          const normalizedModelUrl = m.modelUrl.replace(/\\/g, '/');
          const normalizedExpectedUrl = expectedUrl.replace(/\\/g, '/');
          if (normalizedModelUrl === normalizedExpectedUrl) return true;
          // Try comparing just the filename
          const modelFileName = m.modelUrl?.split(/[/\\]/).pop()?.replace('.3mf', '');
          const hashFileName = r.threeMF?.replace('.3mf', '');
          return modelFileName && hashFileName && modelFileName === hashFileName;
        });
        
        const mergedModel = {
          ...defaultModel,
          ...fullModel,
          id: fullModel?.id || `hash-${r.hash}-${r.baseName}`, // Ensure we always have an ID
          name: fullModel?.name || r.baseName.split(/[/\\]/).pop()?.replace('.3mf', '') || r.baseName, // Use clean filename as name
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
      const resp = await fetch('/api/delete-models', {
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
                  

                  <Button onClick={handleSaveCategories} className="gap-2">
                    <Save className="h-4 w-4" />
                    Save Category Order
                  </Button>

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

                    {hashCheckResult && (
                      <div className="flex flex-wrap gap-4 mt-3 md:mt-0 md:self-end">
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
                              const fileBaseName = file.filePath.split(/[/\\]/).pop()?.replace('.3mf', '');
                              const modelBaseName = m.modelUrl?.split(/[/\\]/).pop()?.replace('.3mf', '');
                              return fileBaseName && modelBaseName && fileBaseName === modelBaseName;
                            });
                            
                            const model = modelData || fallbackModel;
                            
                            return (
                              <div key={file.filePath || `corrupt-${idx}`} 
                                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800"
                                >
                                  <div className="min-w-0 flex-1">
                                  <p className="font-medium text-red-900 dark:text-red-100 truncate">
                                    {model ? getDisplayPath(model) : file.filePath.split('/').pop()?.replace('.3mf', '') || 'Unknown'}
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
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-2"
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
                                            onClick={() => handleRemoveDuplicates(group, model.id)}
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