import { useState, useEffect } from "react";
import { FilterSidebar } from "./components/FilterSidebar";
import { ModelGrid } from "./components/ModelGrid";
import { ModelDetailsDrawer } from "./components/ModelDetailsDrawer";
import { BulkEditDrawer } from "./components/BulkEditDrawer";
import { DonationDialog } from "./components/DonationDialog";
import { SettingsPage } from "./components/SettingsPage";
import { DemoPage } from "./components/DemoPage";
import { ThemeProvider } from "./components/ThemeProvider";
import { ThemeToggle } from "./components/ThemeToggle";
import { Model } from "./types/model";
import { Category } from "./types/category";
import { AppConfig } from "./types/config";
import { ConfigManager } from "./utils/configManager";
// Import package.json to read the last published version (used as previous release)
import * as pkg from '../package.json';
import { applyFiltersToModels, FilterState } from "./utils/filterUtils";
import { Menu, Palette, RefreshCw, Heart, FileCheck, Files, Box } from "lucide-react";
import { Button } from "./components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./components/ui/dropdown-menu";
import { Checkbox } from "./components/ui/checkbox";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./components/ui/alert-dialog";
import { Separator } from "./components/ui/separator";

// Function to load model data from JSON files
// Initial type for view
type ViewType = 'models' | 'settings' | 'demo';

function AppContent() {
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [filteredModels, setFilteredModels] = useState<Model[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<ViewType>('models');
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Loading state for initial models fetch (separate from manual refresh)
  const [isModelsLoading, setIsModelsLoading] = useState(false);

  // Dialog states
  const [isDonationDialogOpen, setIsDonationDialogOpen] = useState(false);
  // Release notes dialog (shown after config is loaded, before/while models load)
  const [isReleaseNotesOpen, setIsReleaseNotesOpen] = useState(false);
  const [dontShowReleaseNotes, setDontShowReleaseNotes] = useState(false);

  // Bulk selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Delete file type selection state
  const [includeThreeMfFiles, setIncludeThreeMfFiles] = useState(false);

  // Overflow menu state for small screens (used by header action overflow)
  // removed unused showOverflowMenu state; DropdownMenu manages its own open state

  // Optional initial tab to open when showing SettingsPage (e.g. 'integrity')
  const [settingsInitialTab, setSettingsInitialTab] = useState<string | undefined>(undefined);
  const [settingsAction, setSettingsAction] = useState<null | { type: 'hash-check' | 'generate'; fileType: '3mf' | 'stl' }>(null);

  // Load configuration and models on app startup
  useEffect(() => {
    async function loadInitialData() {
      try {
        console.debug('[App] loadInitialData() - starting. Checking localStorage key before loading config');

        let config: AppConfig | null = null;

        try {
          const stored = localStorage.getItem('3d-model-muncher-config');
          console.debug('[App] localStorage check for 3d-model-muncher-config:', stored ? '(present)' : '(missing)');

          if (stored) {
            // If localStorage has a value, load and validate it
            config = ConfigManager.loadConfig();
          } else {
            // No local config; attempt to fetch server-side config
            try {
              const resp = await fetch('/api/load-config');
              if (resp.ok) {
                const data = await resp.json();
                if (data && data.success && data.config) {
                  console.debug('[App] Loaded config from server /api/load-config, server lastModified=', data.config.lastModified);
                  config = data.config;
                  // Persist server config locally so subsequent loads use localStorage
                  try { ConfigManager.saveConfig(data.config); } catch (e) { console.warn('[App] Failed to save server config to localStorage', e); }
                }
              } else {
                console.debug('[App] /api/load-config responded with', resp.status);
              }
            } catch (e) {
              console.warn('[App] Failed to fetch server config:', e);
            }
          }
        } catch (e) {
          console.warn('[App] Error while checking localStorage or fetching server config:', e);
        }

        // Fallback to default if still null
        if (!config) {
          console.debug('[App] No config found locally or on server; using default config');
          config = ConfigManager.getDefaultConfig();
        }

        console.debug('[App] Initial config chosen, lastModified=', config.lastModified);
        setAppConfig(config);
        setCategories(config.categories);

        // Load models from the backend API
        setIsModelsLoading(true);
        // Inform the user that model metadata is being loaded (initial load)
        toast("Loading model metadata...", {
          description: "Models are being loaded. This may take a minute for large libraries. Please wait."
        });

        const response = await fetch('/api/models');
        if (!response.ok) {
          throw new Error('Failed to fetch models');
        }
        const loadedModels = await response.json();
        setModels(loadedModels);
        // Apply configured default filters (from appConfig) when initializing filteredModels
        const defaultFilters = config.filters || { defaultCategory: 'all', defaultPrintStatus: 'all', defaultLicense: 'all' };
        const initialFilterState = {
          search: '',
          category: defaultFilters.defaultCategory,
          printStatus: defaultFilters.defaultPrintStatus,
          license: defaultFilters.defaultLicense,
          fileType: 'all',
          tags: [] as string[],
          showHidden: false,
        };
  
  const visibleModels = applyFiltersToModels(loadedModels, initialFilterState as FilterState);
  setFilteredModels(visibleModels);
  setIsModelsLoading(false);
      } catch (error) {
        console.error('Failed to load configuration or models:', error);
        // Use default categories if config fails to load
        const defaultConfig = ConfigManager.getDefaultConfig();
        setAppConfig(defaultConfig);
        setCategories(defaultConfig.categories);
        setIsModelsLoading(false);
      }
    }

    loadInitialData();
  }, []);

  // Show release notes dialog once after appConfig is available unless the user opted out for this version
  useEffect(() => {
    if (!appConfig) return;

    try {
  // Use the previous release number from package.json (the last published version)
  // package.json is imported at build time and represents the distributor's last release.
  const previousVersion = (pkg && pkg.version) ? String(pkg.version) : ConfigManager.getDefaultConfig().version || '0.0.0';
      const key = `release-notes:${previousVersion}`;
      const stored = localStorage.getItem(key);

      if (!stored) {
        // No stored preference - open dialog
        setIsReleaseNotesOpen(true);
      } else {
        // If stored == 'show' -> open; if 'hidden' -> keep closed
        if (stored === 'show') setIsReleaseNotesOpen(true);
      }
    } catch (e) {
      console.warn('Failed to check release notes preference', e);
      setIsReleaseNotesOpen(true);
    }
  }, [appConfig]);

  const closeReleaseNotes = (dontShow: boolean) => {
  const previousVersion = (pkg && pkg.version) ? String(pkg.version) : ConfigManager.getDefaultConfig().version || '0.0.0';
    const key = `release-notes:${previousVersion}`;
    try {
      if (dontShow) {
        localStorage.setItem(key, 'hidden');
      } else {
        localStorage.setItem(key, 'show');
      }
    } catch (e) {
      console.warn('Failed to persist release notes preference', e);
    }
    setDontShowReleaseNotes(dontShow);
    setIsReleaseNotesOpen(false);
  };

  // use centralized applyFiltersToModels from utils/filterUtils

  const handleModelClick = (model: Model) => {
    if (currentView === 'models' && isSelectionMode) {
      handleModelSelection(model.id);
    } else {
      setSelectedModel(model);
      setIsDrawerOpen(true);
    }
  };

  const handleModelUpdate = (updatedModel: Model) => {
    const updatedModels = models.map(model => 
      model.id === updatedModel.id ? updatedModel : model
    );
    setModels(updatedModels);
    setSelectedModel(updatedModel);
    
    // Update filtered models if they contain the updated model
    const updatedFilteredModels = filteredModels.map(model =>
      model.id === updatedModel.id ? updatedModel : model
    );
    setFilteredModels(updatedFilteredModels);
  };

  const handleBulkModelsUpdate = (updatedModels: Model[]) => {
    setModels(updatedModels);
    
    // Update filtered models to reflect changes
    const updatedFilteredModels = filteredModels.map(filteredModel => {
      const updatedModel = updatedModels.find(model => model.id === filteredModel.id);
      return updatedModel || filteredModel;
    });
    setFilteredModels(updatedFilteredModels);
  };

  // Bulk selection handlers
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      // Clear selections when exiting selection mode
      setSelectedModelIds([]);
    }
  };

  const handleModelSelection = (modelId: string) => {
    setSelectedModelIds(prev => 
      prev.includes(modelId) 
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  const selectAllModels = () => {
    const allVisibleIds = filteredModels.map(model => model.id);
    setSelectedModelIds(allVisibleIds);
  };

  const deselectAllModels = () => {
    setSelectedModelIds([]);
  };

  const exitSelectionMode = () => {
    setSelectedModelIds([]);
    setIsSelectionMode(false);
  };

  const getSelectedModels = (): Model[] => {
    return models.filter(model => selectedModelIds.includes(model.id));
  };

  const handleBulkEdit = () => {
    if (selectedModelIds.length === 0) {
      toast("No models selected", {
        description: "Please select models first before bulk editing"
      });
      return;
    }
    setIsBulkEditOpen(true);
  };

  const handleBulkDeleteClick = () => {
    if (selectedModelIds.length === 0) {
      toast("No models selected", {
        description: "Please select models first before deleting"
      });
      return;
    }
    // Reset checkbox to default state when opening dialog (unchecked = only delete munchie.json)
    setIncludeThreeMfFiles(false);
    setIsDeleteDialogOpen(true);
  };

  const handleBulkDelete = async () => {
    console.debug('Bulk delete confirmed, current selection:', selectedModelIds);
    if (selectedModelIds.length === 0) {
      toast("No models selected", {
        description: `Please select models first before deleting. (current: ${selectedModelIds.join(',') || 'none'})`
      });
      return;
    }

    // Close the dialog first
    setIsDeleteDialogOpen(false);

    try {
      const fileTypes = ['json']; // Always delete munchie.json files
      if (includeThreeMfFiles) {
        // When the checkbox is checked, delete the 3D model files in addition to metadata
        fileTypes.push('3mf'); // add .3mf
        fileTypes.push('stl'); // add .stl
      }

      const fileTypeText = includeThreeMfFiles 
        ? 'munchie.json, .3mf and .stl files' 
        : 'munchie.json files';
      
      toast("Deleting model files...", {
        description: `Removing ${fileTypeText} for ${selectedModelIds.length} models`
      });

      // Call API to delete the actual files
      const deleteResponse = await fetch('/api/models/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          modelIds: selectedModelIds,
          fileTypes: fileTypes
        })
      });

      if (!deleteResponse.ok) {
        throw new Error('Failed to delete model files');
      }

      const deleteResult = await deleteResponse.json();
      console.log('Delete result:', deleteResult);

      if (deleteResult.success) {
        // Only remove models that were actually deleted successfully
        // Get the model IDs that had successful deletions
        const successfullyDeletedIds = selectedModelIds.filter(modelId => {
          const model = models.find(m => m.id === modelId);
          if (!model) return false;

          // Consider the model deleted if any of the requested file types for this bulk
          // deletion were actually removed for the model (e.g. 'json', '3mf', 'stl').
          const modelDeleted = deleteResult.deleted?.some((item: any) => 
            item.modelId === modelId && fileTypes.includes(item.type)
          );

          return modelDeleted;
        });

        const updatedModels = models.filter(model => !successfullyDeletedIds.includes(model.id));
        setModels(updatedModels);
        
        const updatedFilteredModels = filteredModels.filter(model => !successfullyDeletedIds.includes(model.id));
        setFilteredModels(updatedFilteredModels);
        
        // Clear selections
        setSelectedModelIds([]);
        
        const successCount = successfullyDeletedIds.length;
        const errorCount = deleteResult.errors?.length || 0;
        
        if (successCount > 0) {
          const fileTypeText = includeThreeMfFiles 
            ? 'munchie.json and .3mf files' 
            : 'munchie.json files';
          
          toast(`Deleted ${successCount} models`, {
            description: errorCount > 0 
              ? `${successCount} models deleted successfully (${fileTypeText}), ${errorCount} failed`
              : `${fileTypeText} have been permanently removed for ${successCount} models`
          });
        }
        
        if (errorCount > 0) {
          console.error('Deletion errors:', deleteResult.errors);
          toast(`${errorCount} models could not be deleted`, {
            description: "Check console for details"
          });
        }
        // After processing deletion results, refresh model metadata to ensure UI shows latest state
        try {
          await handleRefreshModels();
        } catch (err) {
          console.error('Failed to refresh models after deletion:', err);
        }
      } else {
        throw new Error(deleteResult.error || 'Unknown deletion error');
      }
    } catch (error) {
      console.error('Failed to delete models:', error);
      toast("Failed to delete models", {
        description: "Files could not be deleted. Please try again."
      });
    }
  };

  const handleBulkUpdateModels = (updatedModelsData: Partial<Model> & { bulkTagChanges?: { add: string[]; remove: string[] } }) => {
    const updatedModels = models.map(model => {
      if (selectedModelIds.includes(model.id)) {
        let updatedModel = { ...model };

        // Handle regular field updates
        Object.keys(updatedModelsData).forEach(key => {
          if (key !== 'bulkTagChanges' && updatedModelsData[key as keyof Model] !== undefined) {
            (updatedModel as any)[key] = updatedModelsData[key as keyof Model];
          }
        });

        // Handle special tag operations
        if (updatedModelsData.bulkTagChanges) {
          const { add, remove } = updatedModelsData.bulkTagChanges;
          
          // Start with current tags, ensure it's an array
          let newTags = [...(updatedModel.tags || [])];
          
          // Remove specified tags
          if (remove && remove.length > 0) {
            newTags = newTags.filter(tag => !remove.includes(tag));
          }
          
          // Add new tags (avoiding duplicates)
          if (add && add.length > 0) {
            add.forEach(tag => {
              if (!newTags.includes(tag)) {
                newTags.push(tag);
              }
            });
          }
          
          updatedModel.tags = newTags;
        }

        return updatedModel;
      }
      return model;
    });

    setModels(updatedModels);
    
    // Update filtered models
    const updatedFilteredModels = filteredModels.map(model => {
      if (selectedModelIds.includes(model.id)) {
        const updatedModel = updatedModels.find(m => m.id === model.id);
        return updatedModel || model;
      }
      return model;
    });
    setFilteredModels(updatedFilteredModels);

    // Clear selections and exit selection mode
    setSelectedModelIds([]);
    setIsSelectionMode(false);
    setIsBulkEditOpen(false);

    // Build summary message
    const changes = [];
    if (updatedModelsData.category) changes.push(`category to ${updatedModelsData.category}`);
    if (updatedModelsData.license) changes.push(`license to ${updatedModelsData.license}`);
    if (updatedModelsData.isPrinted !== undefined) changes.push(`print status to ${updatedModelsData.isPrinted ? 'printed' : 'not printed'}`);
    if (updatedModelsData.bulkTagChanges) {
      const { add, remove } = updatedModelsData.bulkTagChanges;
      if (add && add.length > 0) changes.push(`added ${add.length} tag${add.length > 1 ? 's' : ''}`);
      if (remove && remove.length > 0) changes.push(`removed ${remove.length} tag${remove.length > 1 ? 's' : ''}`);
    }
    if (updatedModelsData.notes !== undefined) changes.push('notes');
    if (updatedModelsData.source !== undefined) changes.push('source URL');
    if (updatedModelsData.price !== undefined) changes.push(`price to ${updatedModelsData.price?.toFixed(2) || '0.00'}`);

    const changeText = changes.length > 0 ? ` (${changes.join(', ')})` : '';

    toast(`Updated ${selectedModelIds.length} models`, {
      description: `Bulk changes have been applied successfully${changeText}`
    });
  };

  // Merge exact updated models returned from BulkEditDrawer to avoid a full re-fetch.
  const handleBulkSavedModels = (updatedModels: Model[]) => {
    if (!updatedModels || updatedModels.length === 0) return;

    const updatedMap = new Map(updatedModels.map(m => [m.id, m]));

    const mergedModels = models.map(m => updatedMap.has(m.id) ? { ...m, ...(updatedMap.get(m.id) as Model) } : m);
    setModels(mergedModels);

    const mergedFiltered = filteredModels.map(m => updatedMap.has(m.id) ? { ...m, ...(updatedMap.get(m.id) as Model) } : m);
    setFilteredModels(mergedFiltered);

    // Clear selection mode and bulk edit drawer
    setSelectedModelIds([]);
    setIsSelectionMode(false);
    setIsBulkEditOpen(false);
  };

  const handleFilterChange = (filters: {
    search: string;
    category: string;
    printStatus: string;
    license: string;
    fileType: string;
    tags: string[];
    showHidden: boolean;
  }) => {
    let filtered = models;

    // Hidden filter - exclude hidden models unless showHidden is true
    if (!filters.showHidden) {
      filtered = filtered.filter(model => !model.hidden);
    }

    // Search filter - check name and tags
    if (filters.search) {
      filtered = filtered.filter(model =>
        model.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        (model.tags || []).some(tag => tag.toLowerCase().includes(filters.search.toLowerCase()))
      );
    }

    // Category filter
    if (filters.category && filters.category !== "all") {
      filtered = filtered.filter(model =>
        model.category.toLowerCase() === filters.category.toLowerCase()
      );
    }

    // Print status filter
    if (filters.printStatus && filters.printStatus !== "all") {
      filtered = filtered.filter(model =>
        filters.printStatus === "printed" ? model.isPrinted : !model.isPrinted
      );
    }

    // License filter
    if (filters.license && filters.license !== "all") {
      filtered = filtered.filter(model =>
        model.license === filters.license
      );
    }

    // Tag filter - model must have ALL selected tags (AND logic)
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(model =>
        filters.tags.every(selectedTag =>
          (model.tags || []).some(modelTag => 
            modelTag.toLowerCase() === selectedTag.toLowerCase()
          )
        )
      );
    }

    // File type filter - check model filePath or modelUrl for extension
    if (filters.fileType && filters.fileType !== 'all') {
      const ext = filters.fileType.toLowerCase();
      filtered = filtered.filter(model => {
        const path = (model.filePath || model.modelUrl || '').toLowerCase();
        return path.endsWith('.' + ext);
      });
    }

    setFilteredModels(filtered);
    
    // Clear selections if filtered models change
    if (isSelectionMode) {
      const validSelections = selectedModelIds.filter(id => 
        filtered.some(model => model.id === id)
      );
      setSelectedModelIds(validSelections);
    }
  };

  const handleRefreshModels = async () => {
    setIsRefreshing(true);
    try {
      toast("Reloading model metadata...", {
        description: "Refreshing from existing JSON files"
      });

      // Only fetch existing models without triggering generation
      const response = await fetch('/api/models');
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      const updatedModels = await response.json();

      setModels(updatedModels);
      setFilteredModels(updatedModels);

      toast("Models reloaded successfully", {
        description: `Loaded ${updatedModels.length} models from existing files`
      });
    } catch (error) {
      console.error('Failed to refresh models:', error);
      toast("Failed to reload models", {
        description: "Please try again later"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCategoriesUpdate = (updatedCategories: Category[]) => {
    setCategories(updatedCategories);
    
    // Update config with new categories
    if (appConfig) {
      const updatedConfig = {
        ...appConfig,
        categories: updatedCategories
      };
      setAppConfig(updatedConfig);
      
      // Auto-save if enabled
      if (updatedConfig.settings.autoSave) {
        try {
          ConfigManager.saveConfig(updatedConfig);
          // Also attempt to persist to server-side file
          fetch('/api/save-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedConfig)
          }).then(r => r.ok || console.warn('Server config save failed', r.statusText)).catch(err => console.warn('Server save-config error:', err));
        } catch (error) {
          console.error('Failed to auto-save config:', error);
        }
      }
    }
  };

  const handleConfigUpdate = (updatedConfig: AppConfig) => {
    try {
      // Save to localStorage first
      ConfigManager.saveConfig(updatedConfig);
      // Also persist to server-side file
      fetch('/api/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      }).then(r => r.ok || console.warn('Server config save failed', r.statusText)).catch(err => console.warn('Server save-config error:', err));
      // Then update state
      setAppConfig(updatedConfig);
      setCategories(updatedConfig.categories);
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSettingsClick = () => {
    setSettingsInitialTab(undefined);
    setCurrentView('settings');
    // Close drawer if open and clear selections
    setIsDrawerOpen(false);
    setIsSelectionMode(false);
    setSelectedModelIds([]);
  };

  const openSettingsOnTab = (tab: string, action?: { type: 'hash-check' | 'generate'; fileType: '3mf' | 'stl' }) => {
    setSettingsInitialTab(tab);
    setCurrentView('settings');
    setIsDrawerOpen(false);
    setIsSelectionMode(false);
    setSelectedModelIds([]);
    if (action) setSettingsAction(action);
  };

  // Header actions: trigger same backend endpoints as SettingsPage
  // We'll trigger checks/generates by opening Settings -> File Integrity and passing an action

  const handleDemoClick = () => {
    setCurrentView('demo');
    // Close drawer if open and clear selections
    setIsDrawerOpen(false);
    setIsSelectionMode(false);
    setSelectedModelIds([]);
  };

  const handleBackToModels = () => {
    setCurrentView('models');
  };

  const handleDonationClick = () => {
    setIsDonationDialogOpen(true);
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'settings':
        return 'Settings';
      case 'demo':
        return 'UI Demo';
      default:
        return 'Organize & Print';
    }
  };

  // Don't render until config is loaded
  if (!appConfig) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-xl shadow-lg mx-auto">
            <img
              src="/images/favicon-32x32.png"
              alt="3D Model Muncher"
              className="animate-pulse"
            />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Loading 3D Model Muncher</h2>
            <p className="text-muted-foreground">Initializing configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative z-30 lg:z-0
        h-full bg-sidebar border-r border-sidebar-border shadow-xl
        transform transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'w-80 translate-x-0' : 'w-0 lg:w-12 -translate-x-full lg:translate-x-0'}
        overflow-hidden
      `}
      onClick={() => !isSidebarOpen && setIsSidebarOpen(true)}
      >
        <FilterSidebar 
          onFilterChange={handleFilterChange}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onSettingsClick={handleSettingsClick}
          categories={categories}
          models={models}
          initialFilters={{
            search: '',
            category: appConfig?.filters?.defaultCategory || 'all',
            printStatus: appConfig?.filters?.defaultPrintStatus || 'all',
            license: appConfig?.filters?.defaultLicense || 'all',
            fileType: 'all',
            tags: [],
            showHidden: false,
          }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 p-4 border-b bg-card shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className="p-2 hover:bg-accent transition-colors"
            >
              <Menu className="h-4 w-4" />
            </Button>
            {!isSidebarOpen && (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-primary rounded-xl shadow-lg">
                  <img
                    src="/images/favicon-32x32.png"
                    alt="3D Model Muncher"
                  />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground tracking-tight leading-none">
                    3D Model Muncher
                  </h1>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">
                    {getViewTitle()}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Responsive Button Group with Overflow Menu */}
            <div className="flex items-center gap-2">
              {/* Refresh (visible when in models view) - moved into Actions dropdown
                  The old standalone button is commented out below. */}
              { /*
              {currentView === 'models' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshModels}
                  disabled={isRefreshing}
                  className="p-2 hover:bg-accent transition-colors"
                  title="Refresh model metadata"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              )}
              */ }

              {/* Theme toggle (always visible) */}
              <ThemeToggle />

              {/* Quick File Actions dropdown (3MF/STL check/generate) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2 hover:bg-accent transition-colors" title="Actions">
                    <Box className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => { handleRefreshModels(); }} disabled={isRefreshing}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openSettingsOnTab('integrity', { type: 'hash-check', fileType: '3mf' })}> 
                    <FileCheck className="h-4 w-4 mr-2" /> 3MF Check
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openSettingsOnTab('integrity', { type: 'hash-check', fileType: 'stl' })}>
                    <FileCheck className="h-4 w-4 mr-2" /> STL Check
                  </DropdownMenuItem>                  
                  <Separator className="mt-2 mb-2" />
                  <DropdownMenuItem onClick={() => openSettingsOnTab('integrity', { type: 'generate', fileType: '3mf' })}>
                    <Files className="h-4 w-4 mr-2" /> 3MF Generate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openSettingsOnTab('integrity', { type: 'generate', fileType: 'stl' })}>
                    <Files className="h-4 w-4 mr-2" /> STL Generate
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleDonationClick}
                className="p-2 hover:bg-accent transition-colors"
                title="Support the project"
              >
                <Heart className="h-4 w-4" />
              </Button>

              {/* UI Demo button */}
              <div className="hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDemoClick}
                  className="p-2 hover:bg-accent transition-colors"
                  title="UI Demo"
                >
                  <Palette className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-h-0">
          {/* Loading banner shown during initial models load */}
          {isModelsLoading && (
            <div className="flex items-center gap-3 px-4 py-2 bg-yellow-50 border-b border-yellow-200 text-yellow-800">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <div className="text-sm">
                Loading models — this may take a minute for large libraries. Please wait...
              </div>
            </div>
          )}
          {currentView === 'models' ? (
            <ModelGrid 
              models={filteredModels} 
              onModelClick={handleModelClick}
              isSelectionMode={isSelectionMode}
              selectedModelIds={selectedModelIds}
              onModelSelection={handleModelSelection}
              onToggleSelectionMode={toggleSelectionMode}
              onSelectAll={selectAllModels}
              onDeselectAll={deselectAllModels}
              onBulkEdit={handleBulkEdit}
              onBulkDelete={handleBulkDeleteClick}
              config={appConfig}
            />
          ) : currentView === 'settings' ? (
            <SettingsPage 
              onBack={handleBackToModels} 
              categories={categories}
              onCategoriesUpdate={handleCategoriesUpdate}
              config={appConfig}
              onConfigUpdate={handleConfigUpdate}
              models={models}
              onModelsUpdate={handleBulkModelsUpdate}
              onModelClick={handleModelClick}
              onDonationClick={handleDonationClick}
              initialTab={settingsInitialTab}
              settingsAction={settingsAction}
              onActionHandled={() => setSettingsAction(null)}
            />
          ) : (
            <DemoPage onBack={handleBackToModels} />
          )}
        </div>
      </div>

      {/* Model Details Drawer - Show in models and settings view */}
      {(currentView === 'models' && !isSelectionMode || currentView === 'settings') && (
        <ModelDetailsDrawer
          model={selectedModel}
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onModelUpdate={handleModelUpdate}
          defaultModelView={appConfig?.settings.defaultModelView || 'images'}
          categories={categories}
        />
      )}

      {/* Bulk Edit Drawer - Only show in models view */}
      {currentView === 'models' && (
        <BulkEditDrawer
          models={getSelectedModels()}
          isOpen={isBulkEditOpen}
          onClose={() => setIsBulkEditOpen(false)}
          onBulkUpdate={handleBulkUpdateModels}
          onRefresh={handleRefreshModels}
          onBulkSaved={handleBulkSavedModels}
          onClearSelections={exitSelectionMode}
          categories={categories}
          modelDirectory={appConfig?.settings?.modelDirectory || './models'}
        />
      )}

      {/* Donation Dialog */}
      <DonationDialog
        isOpen={isDonationDialogOpen}
        onClose={() => setIsDonationDialogOpen(false)}
      />

      {/* Release Notes Dialog - shown after initialization while models load */}
      <AlertDialog open={isReleaseNotesOpen} onOpenChange={(open) => { if (!open) closeReleaseNotes(dontShowReleaseNotes); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>What's new in this version</AlertDialogTitle>
            <AlertDialogDescription>
              Thanks for updating! Here are a few notable changes in the latest release:
            </AlertDialogDescription>

            <div className="mt-2 text-sm">
              <h3 className="text-lg">v0.10.x - Release updates</h3>
              <ul className="list-disc pl-5 list-inside mb-4">
                <li><strong>Capture 3D previews</strong> - You can now capture the current camera/view from the 3D viewer and save it directly into a model's images while editing. This makes it easy to create thumbnails or gallery images from the exact view you want.</li>
              </ul>
              <h3 className="text-lg">v0.9.x - Release updates</h3>
              <ul className="list-disc pl-5 list-inside">
                <li><strong>Migrations</strong> - Improved image handling to persist user images from parsed images requires migration from versions 0.8.0 and earlier. Use 'Migrate' button in Settings &gt; File Integrity to update files.</li>
                <li>Regenerating now preserves user metadata.</li>
                <li><strong>AI Assisted Generation</strong> - Experimental utility for generating model descriptions, category, tags. See Settings &gt; Experimental tab.</li>
              </ul>
            </div>

            <div className="space-y-3 my-4 mb-4 mt-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="dont-show-release-notes"
                  checked={dontShowReleaseNotes}
                  onCheckedChange={(v) => setDontShowReleaseNotes(Boolean(v))}
                />
                <label 
                  htmlFor="dont-show-release-notes" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Don't show these release notes again for this version
                </label>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <div className="flex-1">
              <a
                href="https://github.com/robsturgill/3d-model-muncher/blob/main/CHANGELOG.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                View full changelog on GitHub
              </a>
            </div>
            <AlertDialogAction onClick={() => { closeReleaseNotes(dontShowReleaseNotes); }}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Models</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedModelIds.length} model{selectedModelIds.length !== 1 ? 's' : ''}? 
              <br /><br />
              <strong>This action cannot be undone.</strong>
            </AlertDialogDescription>
            <div className="space-y-3 my-4 mb-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="include-3mf"
                  checked={includeThreeMfFiles}
                  onCheckedChange={(v) => setIncludeThreeMfFiles(Boolean(v))}
                />
                <label 
                  htmlFor="include-3mf" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Include .3mf and .stl files (3D model files) when deleting
                </label>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {includeThreeMfFiles ? 'Delete All Files' : 'Delete Metadata Only'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <AppContent />
      <Toaster />
    </ThemeProvider>
  );
}