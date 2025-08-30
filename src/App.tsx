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

// Mock data for 3D printing models
const mockModels: Model[] = [
  {
    id: "1",
    name: "Dragon Miniature",
    thumbnail: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1632207691143-643e2a9a9361?w=600&h=400&fit=crop"
    ],
    tags: ["Miniature", "Fantasy", "Dragon"],
    isPrinted: true,
    printTime: "4h 30m",
    filamentUsed: "125g",
    category: "Miniatures",
    description: "Detailed dragon miniature perfect for tabletop gaming. High detail model with intricate scales and wings.",
    fileSize: "45.2 MB",
    modelUrl: "/models/dragon_miniature.3mf",
    license: "Creative Commons - Attribution",
    notes: "Printed with 0.2mm layers using PLA+. Had to add supports for the wings. Consider scaling up to 150% for better detail visibility.",
    source: "https://www.thingiverse.com/thing:123456",
    price: 15.99,
    printSettings: {
      layerHeight: "0.2mm",
      infill: "15%",
      supports: "Yes"
    }
  },
  {
    id: "2",
    name: "Phone Stand",
    thumbnail: "https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=400&h=300&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop"
    ],
    tags: ["Utility", "Phone", "Stand"],
    isPrinted: false,
    printTime: "2h 15m",
    filamentUsed: "75g",
    category: "Utility",
    description: "Adjustable phone stand that works with most smartphones. Clean modern design.",
    fileSize: "12.8 MB",
    modelUrl: "/models/phone_stand.3mf",
    license: "MIT License",
    notes: "Planning to print this for my desk setup. Might need to adjust the angle for my phone size.",
    source: "https://www.printables.com/model/789012",
    printSettings: {
      layerHeight: "0.3mm",
      infill: "20%",
      supports: "No"
    }
  },
  {
    id: "3",
    name: "Vase - Spiral",
    thumbnail: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400&h=300&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=600&h=400&fit=crop"
    ],
    tags: ["Decorative", "Vase", "Spiral"],
    isPrinted: true,
    printTime: "6h 45m",
    filamentUsed: "200g",
    category: "Decorative",
    description: "Beautiful spiral vase design. Perfect for small flowers or as a decorative piece.",
    fileSize: "28.5 MB",
    modelUrl: "/models/spiral_vase.3mf",
    license: "Public Domain",
    notes: "Printed beautifully in silk PLA. The spiral pattern looks amazing with light passing through. Used 0.25mm layers for smooth finish.",
    price: 24.50,
    printSettings: {
      layerHeight: "0.25mm",
      infill: "10%",
      supports: "No"
    }
  },
  {
    id: "4",
    name: "Chess Set - King",
    thumbnail: "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=400&h=300&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1606166187734-a4cb74d3e66b?w=600&h=400&fit=crop"
    ],
    tags: ["Game", "Chess", "King"],
    isPrinted: false,
    printTime: "3h 20m",
    filamentUsed: "90g",
    category: "Games",
    description: "Classic chess king piece with detailed crown and base. Part of a complete chess set.",
    fileSize: "18.7 MB",
    modelUrl: "/models/chess_king.3mf",
    license: "Creative Commons - Attribution",
    source: "https://www.myminifactory.com/object/345678",
    printSettings: {
      layerHeight: "0.2mm",
      infill: "15%",
      supports: "Yes"
    }
  },
  {
    id: "5",
    name: "Tool Organizer",
    thumbnail: "https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=400&h=300&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=600&h=400&fit=crop"
    ],
    tags: ["Organizer", "Tools", "Storage"],
    isPrinted: true,
    printTime: "5h 10m",
    filamentUsed: "180g",
    category: "Utility",
    description: "Modular tool organizer system. Perfect for organizing screwdrivers, bits, and small tools.",
    fileSize: "34.1 MB",
    modelUrl: "/models/tool_organizer.3mf",
    license: "GNU GPL v3",
    notes: "Works perfectly in my workshop. The modular design is brilliant - you can connect multiple units together. Printed in PETG for durability.",
    source: "https://www.prusaprinters.org/prints/456789",
    printSettings: {
      layerHeight: "0.3mm",
      infill: "25%",
      supports: "No"
    }
  },
  {
    id: "6",
    name: "Succulent Planter",
    thumbnail: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&h=400&fit=crop"
    ],
    tags: ["Planter", "Succulent", "Garden"],
    isPrinted: false,
    printTime: "4h 00m",
    filamentUsed: "140g",
    category: "Decorative",
    description: "Modern geometric planter designed specifically for succulents. Includes drainage holes.",
    fileSize: "22.3 MB",
    modelUrl: "/models/succulent_planter.3mf",
    license: "Creative Commons - Attribution-ShareAlike",
    printSettings: {
      layerHeight: "0.25mm",
      infill: "20%",
      supports: "No"
    }
  },
  {
    id: "7",
    name: "Mechanical Keyboard Keycap",
    thumbnail: "https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400&h=300&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1595044426077-d36d9236d54a?w=600&h=400&fit=crop"
    ],
    tags: ["Keyboard", "Keycap", "Gaming"],
    isPrinted: true,
    printTime: "1h 30m",
    filamentUsed: "15g",
    category: "Utility",
    description: "Custom keycap for mechanical keyboards. Cherry MX compatible.",
    fileSize: "8.5 MB",
    modelUrl: "/models/keycap.3mf",
    license: "MIT License",
    notes: "Perfect fit on my mechanical keyboard. Printed with high resolution (0.15mm) for smooth surface finish. Consider printing in ABS for better durability.",
    price: 3.75,
    printSettings: {
      layerHeight: "0.15mm",
      infill: "100%",
      supports: "No"
    }
  },
  {
    id: "8",
    name: "Miniature House",
    thumbnail: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1502005229762-cf1b2da60d9b?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1519338381761-c7523edc1f46?w=600&h=400&fit=crop"
    ],
    tags: ["Miniature", "House", "Architecture"],
    isPrinted: false,
    printTime: "8h 15m",
    filamentUsed: "320g",
    category: "Miniatures",
    description: "Detailed miniature house with removable roof and interior details.",
    fileSize: "67.8 MB",
    modelUrl: "/models/miniature_house.3mf",
    license: "Creative Commons - Attribution-NonCommercial",
    source: "https://cults3d.com/en/3d-model/house/miniature-house",
    printSettings: {
      layerHeight: "0.2mm",
      infill: "15%",
      supports: "Yes"
    }
  },
  {
    id: "9",
    name: "Cable Management Clip",
    thumbnail: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1606925797300-0b48a814c963?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1515378791036-0648a814c963?w=600&h=400&fit=crop"
    ],
    tags: ["Cable", "Organizer", "Desk"],
    isPrinted: true,
    printTime: "45m",
    filamentUsed: "12g",
    category: "Utility",
    description: "Simple cable management clip for desk organization.",
    fileSize: "3.2 MB",
    modelUrl: "/models/cable_clip.3mf",
    license: "Public Domain",
    notes: "Super useful for keeping cables organized. Printed a dozen of these for my entire desk setup. TPU would work even better for flexibility.",
    printSettings: {
      layerHeight: "0.3mm",
      infill: "30%",
      supports: "No"
    }
  },
  {
    id: "10",
    name: "Fantasy Sword",
    thumbnail: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=600&h=400&fit=crop"
    ],
    tags: ["Fantasy", "Sword", "Cosplay"],
    isPrinted: false,
    printTime: "12h 30m",
    filamentUsed: "450g",
    category: "Props",
    description: "Full-scale fantasy sword for cosplay and display.",
    fileSize: "89.4 MB",
    modelUrl: "/models/fantasy_sword.3mf",
    license: "Creative Commons - Attribution-ShareAlike",
    notes: "Planning to print this for my upcoming cosplay convention. Will need to print in sections and assemble. Consider reinforcing with metal rod.",
    source: "https://www.thingiverse.com/thing:987654",
    printSettings: {
      layerHeight: "0.25mm",
      infill: "20%",
      supports: "Yes"
    }
  },
  {
    id: "11",
    name: "Lithophane Frame",
    thumbnail: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1493236715438-c58963f76770?w=600&h=400&fit=crop"
    ],
    tags: ["Frame", "Photo", "Lithophane"],
    isPrinted: true,
    printTime: "3h 45m",
    filamentUsed: "95g",
    category: "Decorative",
    description: "Frame designed for lithophane photos with LED backlighting.",
    fileSize: "24.7 MB",
    modelUrl: "/models/lithophane_frame.3mf",
    license: "BSD 3-Clause License",
    notes: "Beautiful results with family photos converted to lithophanes. Used white PLA for best light transmission. The LED strip integration works perfectly.",
    printSettings: {
      layerHeight: "0.2mm",
      infill: "15%",
      supports: "No"
    }
  },
  {
    id: "12",
    name: "Dice Set",
    thumbnail: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400&h=300&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1606166187734-a4cb74d3e66b?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1608889476518-738c9b1dcb37?w=600&h=400&fit=crop"
    ],
    tags: ["Dice", "Gaming", "D&D"],
    isPrinted: false,
    printTime: "6h 20m",
    filamentUsed: "180g",
    category: "Games",
    description: "Complete RPG dice set including D4, D6, D8, D10, D12, and D20.",
    fileSize: "31.6 MB",
    modelUrl: "/models/dice_set.3mf",
    license: "Apache License 2.0",
    source: "https://www.printables.com/model/654321",
    printSettings: {
      layerHeight: "0.15mm",
      infill: "20%",
      supports: "Yes"
    }
  }
];

type ViewType = 'models' | 'settings' | 'demo';

function AppContent() {
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [models, setModels] = useState<Model[]>(mockModels);
  const [filteredModels, setFilteredModels] = useState<Model[]>(mockModels);
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

  // Load configuration on app startup
  useEffect(() => {
    try {
      const config = ConfigManager.loadConfig();
      setAppConfig(config);
      setCategories(config.categories);
    } catch (error) {
      console.error('Failed to load configuration:', error);
      // Use default categories if config fails to load
      const defaultConfig = ConfigManager.getDefaultConfig();
      setAppConfig(defaultConfig);
      setCategories(defaultConfig.categories);
    }
  }, []);

  const handleModelClick = (model: Model) => {
    if (isSelectionMode) {
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
        description: "Checking for changes and updating metadata"
      });

      // Simulate scanning each model file
      const updatedModels = await Promise.all(
        models.map(async (model) => {
          const scannedData = await scanModelFile(model);
          return { ...model, ...scannedData };
        })
      );

      setModels(updatedModels);
      setFilteredModels(updatedModels);

      toast("Models refreshed successfully", {
        description: `Updated ${updatedModels.length} model files`
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
      {(currentView === 'models' || currentView === 'settings') && !isSelectionMode && (
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