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
import { scanModelFile } from "./utils/fileManager";
import { Menu, Box, Palette, RefreshCw, CheckSquare, Square, Edit, Trash2, X, Heart } from "lucide-react";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { toast } from "sonner@2.0.3";

// Function to load model data from JSON files
// Initial type for view
type ViewType = 'models' | 'settings' | 'demo';

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

  // Load configuration and models on app startup
  useEffect(() => {
    async function loadInitialData() {
      try {
        const config = ConfigManager.loadConfig();
        setAppConfig(config);
        setCategories(config.categories);

        // Load models from the backend API
        const response = await fetch('http://localhost:3001/api/models');
        if (!response.ok) {
          throw new Error('Failed to fetch models');
        }
        const loadedModels = await response.json();
        setModels(loadedModels);
        setFilteredModels(loadedModels);
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

  const handleBulkDelete = () => {
    if (selectedModelIds.length === 0) {
      toast("No models selected", {
        description: "Please select models first before deleting"
      });
      return;
    }

    const updatedModels = models.filter(model => !selectedModelIds.includes(model.id));
    setModels(updatedModels);
    
    // Update filtered models
    const updatedFilteredModels = filteredModels.filter(model => !selectedModelIds.includes(model.id));
    setFilteredModels(updatedFilteredModels);
    
    // Clear selections
    setSelectedModelIds([]);
    
    toast(`Deleted ${selectedModelIds.length} models`, {
      description: "Selected models have been removed from your collection"
    });
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
          
          // Start with current tags
          let newTags = [...updatedModel.tags];
          
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
  }) => {
    let filtered = models;

    // Search filter - check name and tags
    if (filters.search) {
      filtered = filtered.filter(model =>
        model.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        model.tags.some(tag => tag.toLowerCase().includes(filters.search.toLowerCase()))
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
          model.tags.some(modelTag => 
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
      toast("Scanning model files...", {
        description: "Checking for new files and updating metadata"
      });

      // 1. Get all *-munchie.json files in models/ directory
      // This requires a backend API endpoint to list files, but for now, we'll fetch from the backend
      const response = await fetch('http://localhost:3001/api/models');
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      const loadedModels = await response.json();

      // 2. Scan each model file for updated metadata
      const updatedModels = await Promise.all(
        loadedModels.map(async (model: Model) => {
          const scannedData = await scanModelFile(model);
          return { ...model, ...scannedData };
        })
      );

      setModels(updatedModels);
      setFilteredModels(updatedModels);

      toast("Models refreshed successfully", {
        description: `Found and updated ${updatedModels.length} model files`
      });
    } catch (error) {
      console.error('Failed to refresh models:', error);
      toast("Failed to refresh models", {
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
    setAppConfig(updatedConfig);
    setCategories(updatedConfig.categories);
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
            <Box className="h-8 w-8 text-white animate-pulse" />
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
                  <Box className="h-6 w-6 text-white" />
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
                          onClick={handleBulkDelete}
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
              className="p-2 hover:bg-accent transition-colors"
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
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="3d-model-muncher-theme">
      <AppContent />
    </ThemeProvider>
  );
}