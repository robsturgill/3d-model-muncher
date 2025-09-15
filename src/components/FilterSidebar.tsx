import { useState } from "react";
import { Search, Filter, Layers, Package, Gamepad2, Wrench, Flower, X, Settings, Sword, FileText, EyeOff } from "lucide-react";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Category } from "../types/category";
import { Model } from "../types/model";
import { ScrollArea } from "./ui/scroll-area";

interface FilterSidebarProps {
  onFilterChange: (filters: {
    search: string;
    category: string;
    printStatus: string;
    license: string;
    fileType: string;
    tags: string[];
    showHidden: boolean;
  }) => void;
  isOpen: boolean;
  onClose: () => void;
  onSettingsClick: () => void;
  categories: Category[];
  models: Model[];
}

// Icon mapping for categories
const iconMap: Record<string, typeof Package> = {
  Package,
  Gamepad2,
  Wrench,
  Flower,
  Sword,
};

export function FilterSidebar({
  onFilterChange,
  isOpen,
  onClose,
  onSettingsClick,
  categories,
  models
}: FilterSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPrintStatus, setSelectedPrintStatus] = useState("all");
  const [selectedLicense, setSelectedLicense] = useState("all");
  const [selectedFileType, setSelectedFileType] = useState("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showHidden, setShowHidden] = useState(false);

  // Dynamically get all unique tags from the models
  const getAllTags = (): string[] => {
    const tagSet = new Set<string>();
    
    if (!models) {
      return [];
    }

    models.forEach(model => {
      if (!model || !Array.isArray(model.tags)) {
        return;
      }

      model.tags.forEach(tag => {
        if (tag && typeof tag === 'string') {
          tagSet.add(tag);
        }
      });
    });

    // Sort tags alphabetically and return as array
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  };

  const availableTags = getAllTags();

  // Available licenses
  const availableLicenses = [
    "Creative Commons - Attribution",
    "Creative Commons - Attribution-ShareAlike",
    "Creative Commons - Attribution-NonCommercial",
    "MIT License",
    "GNU GPL v3",
    "Apache License 2.0",
    "BSD 3-Clause License",
    "Public Domain"
  ];

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    onFilterChange({
      search: value,
      category: selectedCategory,
      printStatus: selectedPrintStatus,
      license: selectedLicense,
      fileType: selectedFileType,
      tags: selectedTags,
      showHidden: showHidden,
    });
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    onFilterChange({
      search: searchTerm,
      category: value,
      printStatus: selectedPrintStatus,
      license: selectedLicense,
      fileType: selectedFileType,
      tags: selectedTags,
      showHidden: showHidden,
    });
  };

  const handlePrintStatusChange = (value: string) => {
    setSelectedPrintStatus(value);
    onFilterChange({
      search: searchTerm,
      category: selectedCategory,
      printStatus: value,
      license: selectedLicense,
      fileType: selectedFileType,
      tags: selectedTags,
      showHidden: showHidden,
    });
  };

  const handleLicenseChange = (value: string) => {
    setSelectedLicense(value);
    onFilterChange({
      search: searchTerm,
      category: selectedCategory,
      printStatus: selectedPrintStatus,
      license: value,
      fileType: selectedFileType,
      tags: selectedTags,
      showHidden: showHidden,
    });
  };

  const handleFileTypeChange = (value: string) => {
    setSelectedFileType(value);
    onFilterChange({
      search: searchTerm,
      category: selectedCategory,
      printStatus: selectedPrintStatus,
      license: selectedLicense,
      fileType: value,
      tags: selectedTags,
      showHidden: showHidden,
    });
  };

  const handleTagToggle = (tag: string) => {
    const newSelectedTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(newSelectedTags);
    
    // Immediately apply the tag filter
    onFilterChange({
      search: searchTerm,
      category: selectedCategory,
      printStatus: selectedPrintStatus,
      license: selectedLicense,
      fileType: selectedFileType,
      tags: newSelectedTags,
      showHidden: showHidden,
    });
  };

  const handleShowHiddenChange = (checked: boolean) => {
    setShowHidden(checked);
    onFilterChange({
      search: searchTerm,
      category: selectedCategory,
      printStatus: selectedPrintStatus,
      license: selectedLicense,
      fileType: selectedFileType,
      tags: selectedTags,
      showHidden: checked,
    });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedPrintStatus("all");
    setSelectedLicense("all");
    setSelectedFileType("all");
    setSelectedTags([]);
    setShowHidden(false);
    onFilterChange({
      search: "",
      category: "all",
      printStatus: "all",
      license: "all",
      fileType: "all",
      tags: [],
      showHidden: false,
    });
  };

  return (
    <div className="h-full bg-sidebar flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border shrink-0 bg-gradient-primary">
        {isOpen ? (
          <>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 shadow-lg">
                <img
                  src="/images/favicon-32x32.png"
                  alt="3D Model Muncher"
                />
              </div>
              <div>
                <h2
                  className="font-semibold text-white text-lg tracking-tight cursor-pointer hover:underline"
                  onClick={() => window.location.pathname = "/"}
                >
                  3D Model Muncher
                </h2>
                <p className="text-xs text-white/80 font-medium">Organize & Print</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSettingsClick}
                className="p-2 text-white hover:bg-white/20 hover:backdrop-blur-sm border-0"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-2 text-white hover:bg-white/20 hover:backdrop-blur-sm border-0 lg:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="flex items-center justify-center w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
              <img
                src="/images/favicon-16x16.png"
                alt="3D Model Muncher"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSettingsClick}
              className="p-2 text-white hover:bg-white/20 hover:backdrop-blur-sm border-0"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {isOpen && (
        <ScrollArea className="flex-1 min-h-0">
          <div className="h-full p-4 space-y-6">

            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search models..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-foreground" />
                <label className="text-sm font-medium text-foreground">Categories</label>
              </div>
              <div className="space-y-1">
                <Button
                  variant={selectedCategory === "all" ? "default" : "ghost"}
                  onClick={() => handleCategoryChange("all")}
                  className={`w-full justify-start h-10 px-3 ${
                    selectedCategory === "all" 
                      ? "text-primary-foreground hover:text-primary-foreground" 
                      : "text-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Filter className="h-4 w-4 mr-3" />
                  <span>All Categories</span>
                </Button>
                
                {categories.map((category) => {
                  const Icon = iconMap[category.icon] || Package;
                  return (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? "default" : "ghost"}
                      onClick={() => handleCategoryChange(category.id)}
                      className={`w-full justify-start h-10 px-3 ${
                        selectedCategory === category.id 
                          ? "text-primary-foreground hover:text-primary-foreground" 
                          : "text-foreground hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-3" />
                      <span>{category.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Print Status */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Print Status</label>
              <Select value={selectedPrintStatus} onValueChange={handlePrintStatusChange}>
                <SelectTrigger className="bg-background border-border text-foreground focus:ring-2 focus:ring-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="printed">Printed</SelectItem>
                  <SelectItem value="not-printed">Not Printed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* File Type Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">File Type</label>
              <Select value={selectedFileType} onValueChange={handleFileTypeChange}>
                <SelectTrigger className="bg-background border-border text-foreground focus:ring-2 focus:ring-primary">
                  <SelectValue placeholder="All File Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Files</SelectItem>
                  <SelectItem value="3mf">3MF</SelectItem>
                  <SelectItem value="stl">STL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* License Filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-foreground" />
                <label className="text-sm font-medium text-foreground">License</label>
              </div>
              <Select value={selectedLicense} onValueChange={handleLicenseChange}>
                <SelectTrigger className="bg-background border-border text-foreground focus:ring-2 focus:ring-primary">
                  <SelectValue placeholder="All Licenses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Licenses</SelectItem>
                  {availableLicenses.map((license) => (
                    <SelectItem key={license} value={license}>
                      {license}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Show Hidden Models */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-foreground" />
                  <label className="text-sm font-medium text-foreground">Show Hidden Models</label>
                </div>
                <Switch
                  checked={showHidden}
                  onCheckedChange={handleShowHiddenChange}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Popular Tags</label>
              <div className="flex flex-wrap gap-2">
                {availableTags.slice(0, 12).map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "secondary"}
                    className="cursor-pointer text-xs hover:bg-primary/90 transition-colors"
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
              {selectedTags.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {selectedTags.length} tag{selectedTags.length > 1 ? 's' : ''} selected
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedTags.map((tag) => (
                      <Badge
                        key={`selected-${tag}`}
                        variant="default"
                        className="text-xs cursor-pointer hover:bg-primary/80"
                        onClick={() => handleTagToggle(tag)}
                      >
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Separator className="bg-border" />

            {/* Clear Filters */}
            <Button 
              variant="outline" 
              onClick={clearFilters}
              className="w-full bg-background border-border text-foreground hover:bg-accent hover:text-accent-foreground hover:border-primary transition-colors"
            >
              Clear All Filters
            </Button>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}