import { useState } from "react";
import { Search, Filter, Layers, Package, Gamepad2, Wrench, Flower, X, Settings, Sword, Box, FileText } from "lucide-react";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { Category } from "../types/category";

interface FilterSidebarProps {
  onFilterChange: (filters: {
    search: string;
    category: string;
    printStatus: string;
    license: string;
    tags: string[];
  }) => void;
  isOpen: boolean;
  onClose: () => void;
  onSettingsClick: () => void;
  categories: Category[];
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
  categories
}: FilterSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPrintStatus, setSelectedPrintStatus] = useState("all");
  const [selectedLicense, setSelectedLicense] = useState("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Available tags (in a real app, this might come from the API)
  const availableTags = [
    "Miniature", "Fantasy", "Dragon", "Utility", "Phone", "Stand", 
    "Decorative", "Vase", "Spiral", "Game", "Chess", "Gaming", 
    "Organizer", "Tools", "Storage", "Planter", "Succulent", "Garden",
    "Keyboard", "Keycap", "House", "Architecture", "Cable", "Desk",
    "Sword", "Cosplay", "Frame", "Photo", "Lithophane", "Dice", "D&D"
  ];

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
      tags: selectedTags,
    });
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    onFilterChange({
      search: searchTerm,
      category: value,
      printStatus: selectedPrintStatus,
      license: selectedLicense,
      tags: selectedTags,
    });
  };

  const handlePrintStatusChange = (value: string) => {
    setSelectedPrintStatus(value);
    onFilterChange({
      search: searchTerm,
      category: selectedCategory,
      printStatus: value,
      license: selectedLicense,
      tags: selectedTags,
    });
  };

  const handleLicenseChange = (value: string) => {
    setSelectedLicense(value);
    onFilterChange({
      search: searchTerm,
      category: selectedCategory,
      printStatus: selectedPrintStatus,
      license: value,
      tags: selectedTags,
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
      tags: newSelectedTags,
    });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedPrintStatus("all");
    setSelectedLicense("all");
    setSelectedTags([]);
    onFilterChange({
      search: "",
      category: "all",
      printStatus: "all",
      license: "all",
      tags: [],
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
                <Box className="h-6 w-6 text-white" />
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
              <Box className="h-5 w-5 text-white" />
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
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
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
      )}
    </div>
  );
}