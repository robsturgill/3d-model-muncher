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
import { Menu, Palette, RefreshCw, CheckSquare, Square, Edit, Trash2, X, Heart } from "lucide-react";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
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

  // Dialog states
  const [isDonationDialogOpen, setIsDonationDialogOpen] = useState(false);

  // Bulk selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Load configuration and models on app startup
  useEffect(() => {
    async function loadInitialData() {
      try {
        const config = ConfigManager.loadConfig();

        setAppConfig(config);
        setCategories(config.categories);

        // Load models from the backend API
        const response = await fetch('/api/models');
        if (!response.ok) {
          throw new Error('Failed to fetch models');
        }
        const loadedModels = await response.json();
        setModels(loadedModels);
        // Filter out hidden models by default
        const visibleModels = loadedModels.filter((model: Model) => !model.hidden);
        setFilteredModels(visibleModels);
      } catch (error) {
        console.error('Failed to load configuration or models:', error);
        // Use default categories if config fails to load
        const defaultConfig = ConfigManager.getDefaultConfig();
        setAppConfig(defaultConfig);
        setCategories(defaultConfig.categories);
      }
    }

    loadInitialData();
  }, []);

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
    setIsDeleteDialogOpen(true);
  };

  const handleBulkDelete = async () => {
    if (selectedModelIds.length === 0) {
      toast("No models selected", {
        description: "Please select models first before deleting"
      });
      return;
    }

    // Close the dialog first
    setIsDeleteDialogOpen(false);

    try {
      toast("Deleting model files...", {
        description: `Removing ${selectedModelIds.length} models and their files`
      });

      // Call API to delete the actual files
      const deleteResponse = await fetch('/api/models/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ modelIds: selectedModelIds })
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
          
          // Check if this model's files were actually deleted
          const modelDeleted = deleteResult.deleted?.some((item: any) => 
            item.modelId === modelId && item.type === '3mf'
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
          toast(`Deleted ${successCount} models`, {
            description: errorCount > 0 
              ? `${successCount} models deleted successfully, ${errorCount} failed`
              : "Models and their files have been permanently removed"
          });
        }
        
        if (errorCount > 0) {
          console.error('Deletion errors:', deleteResult.errors);
          toast(`${errorCount} models could not be deleted`, {
            description: "Check console for details"
          });
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

  const handleFilterChange = (filters: {
    search: string;
    category: string;
    printStatus: string;
    license: string;
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
    setCurrentView('settings');
    // Close drawer if open and clear selections
    setIsDrawerOpen(false);
    setIsSelectionMode(false);
    setSelectedModelIds([]);
  };

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
                  <h1 className="text-lg font-semibold text-foreground tracking-tight">
                    3D Model Muncher
                  </h1>
                  <p className="text-xs text-muted-foreground -mt-1 font-medium">
                    {getViewTitle()}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Selection Mode Controls - Only show in models view */}
            {currentView === 'models' && (
              <>
                {isSelectionMode ? (
                  <div className="flex items-center gap-2 mr-2">
                    <Badge variant="secondary" className="gap-1">
                      {selectedModelIds.length} selected
                    </Badge>
                    
                    {selectedModelIds.length > 0 && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleBulkEdit}
                          className="gap-2"
                          title="Bulk edit selected models"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleBulkDeleteClick}
                          className="gap-2 text-destructive hover:text-destructive"
                          title="Delete selected models"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </>
                    )}
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={selectAllModels}
                        title="Select all visible models"
                      >
                        <CheckSquare className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={deselectAllModels}
                        title="Deselect all models"
                      >
                        <Square className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleSelectionMode}
                      className="gap-2"
                      title="Exit selection mode"
                    >
                      <X className="h-4 w-4" />
                      Done
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSelectionMode}
                    className="gap-2"
                    title="Enter selection mode"
                  >
                    <CheckSquare className="h-4 w-4" />
                    Select
                  </Button>
                )}
              </>
            )}

            {/* Refresh Models Button - Only show in models view */}
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
            
            {/* Support Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDonationClick}
              className="p-2 hover:bg-accent transition-colors"
              title="Support the project"
            >
              <Heart className="h-4 w-4" />
            </Button>
            
            {/* Demo Page Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDemoClick}
              className="p-2 hover:bg-accent transition-colors hidden"
              title="UI Demo"
            >
              <Palette className="h-4 w-4" />
            </Button>
            
            {/* Theme Toggle */}
            <ThemeToggle />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-h-0">
          {currentView === 'models' ? (
            <ModelGrid 
              models={filteredModels} 
              onModelClick={handleModelClick}
              isSelectionMode={isSelectionMode}
              selectedModelIds={selectedModelIds}
              onModelSelection={handleModelSelection}
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
        />
      )}

      {/* Bulk Edit Drawer - Only show in models view */}
      {currentView === 'models' && (
        <BulkEditDrawer
          models={getSelectedModels()}
          isOpen={isBulkEditOpen}
          onClose={() => setIsBulkEditOpen(false)}
          onBulkUpdate={handleBulkUpdateModels}
          categories={categories}
        />
      )}

      {/* Donation Dialog */}
      <DonationDialog
        isOpen={isDonationDialogOpen}
        onClose={() => setIsDonationDialogOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Models</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedModelIds.length} model{selectedModelIds.length !== 1 ? 's' : ''}? 
              This action will permanently remove both the 3MF files and their corresponding munchie.json metadata files from your system.
              <br /><br />
              <strong>This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Files
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