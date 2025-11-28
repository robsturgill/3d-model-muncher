import { AppConfig } from "../types/config";

const CONFIG_FILENAME = "3d-model-muncher-config.json";
const STORAGE_KEY = "3d-model-muncher-config";

export class ConfigManager {
  private static defaultConfig: AppConfig = {
    version: "1.0.0",
    categories: [
      { id: "uncategorized", label: "Uncategorized", icon: "Folder" },
      { id: "miniatures", label: "Miniatures", icon: "Package" },
      { id: "utility", label: "Utility", icon: "Wrench" },
      { id: "decorative", label: "Decorative", icon: "Flower" },
      { id: "games", label: "Games", icon: "Gamepad2" },
      { id: "props", label: "Props", icon: "Sword" },
    ],
    settings: {
      defaultTheme: "system",
      defaultView: "grid",
      defaultGridDensity: 4,
      defaultModelView: "images",
      defaultModelColor: "#aaaaaa",
      showPrintedBadge: true,
      modelCardPrimary: 'printTime',
      modelCardSecondary: 'filamentUsed',
      autoSave: true,
      modelDirectory: "./models",
    },
    filters: {
      defaultCategory: "all",
      defaultPrintStatus: "all",
      defaultLicense: "all",
      defaultSortBy: "none"
    },
    lastModified: new Date().toISOString()
  };

  private static validateTheme(theme: any): "light" | "dark" | "system" | undefined {
    return ["light", "dark", "system"].includes(theme) ? theme as "light" | "dark" | "system" : undefined;
  }

  private static validateView(view: any): "grid" | "list" | undefined {
    return ["grid", "list"].includes(view) ? view as "grid" | "list" : undefined;
  }

  private static validateModelView(view: any): "3d" | "images" | undefined {
    return ["3d", "images"].includes(view) ? view as "3d" | "images" : undefined;
  }

  /**
   * Validate and merge configuration with defaults
   */
  private static validateConfig(config: any): AppConfig {
    const validatedConfig: AppConfig = {
      version: config?.version || this.defaultConfig.version,
      categories: Array.isArray(config?.categories) ? config.categories : this.defaultConfig.categories,
      settings: {
        defaultTheme: (() => {
          const theme = config?.settings?.defaultTheme;
          const validated = this.validateTheme(theme);
          return validated !== undefined ? validated : this.defaultConfig.settings.defaultTheme;
        })(),
        defaultView: (() => {
          const view = config?.settings?.defaultView;
          const validated = this.validateView(view);
          return validated !== undefined ? validated : this.defaultConfig.settings.defaultView;
        })(),
        defaultGridDensity: typeof config?.settings?.defaultGridDensity === 'number' && !isNaN(config.settings.defaultGridDensity) 
          ? config.settings.defaultGridDensity 
          : this.defaultConfig.settings.defaultGridDensity,
        defaultModelView: (() => {
          const modelView = config?.settings?.defaultModelView;
          const validated = this.validateModelView(modelView);
          return validated !== undefined ? validated : this.defaultConfig.settings.defaultModelView;
        })(),
        defaultModelColor: typeof config?.settings?.defaultModelColor === 'string' && config.settings.defaultModelColor.trim() !== ''
          ? config.settings.defaultModelColor
          : this.defaultConfig.settings.defaultModelColor,
        modelCardPrimary: ((): 'none' | 'printTime' | 'filamentUsed' | 'fileSize' | 'category' | 'designer' | 'layerHeight' | 'nozzle' | 'price' => {
          const val = config?.settings?.modelCardPrimary;
          const allowed = ['none', 'printTime', 'filamentUsed', 'fileSize', 'category', 'designer', 'layerHeight', 'nozzle', 'price'];
          return allowed.includes(val) ? val : this.defaultConfig.settings.modelCardPrimary;
        })(),
        modelCardSecondary: ((): 'none' | 'printTime' | 'filamentUsed' | 'fileSize' | 'category' | 'designer' | 'layerHeight' | 'nozzle' | 'price' => {
          const val = config?.settings?.modelCardSecondary;
          const allowed = ['none', 'printTime', 'filamentUsed', 'fileSize', 'category', 'designer', 'layerHeight', 'nozzle', 'price'];
          return allowed.includes(val) ? val : this.defaultConfig.settings.modelCardSecondary;
        })(),
        showPrintedBadge: typeof config?.settings?.showPrintedBadge === 'boolean'
          ? config.settings.showPrintedBadge
          : this.defaultConfig.settings.showPrintedBadge,
        autoSave: config?.settings?.autoSave !== undefined && config.settings.autoSave !== null
          ? Boolean(config.settings.autoSave)
          : this.defaultConfig.settings.autoSave,
        modelDirectory: typeof config?.settings?.modelDirectory === 'string' && config.settings.modelDirectory.trim() !== ''
          ? config.settings.modelDirectory
          : this.defaultConfig.settings.modelDirectory,
      },
      filters: {
        defaultCategory: typeof config?.filters?.defaultCategory === 'string' && config.filters.defaultCategory.trim() !== ''
          ? config.filters.defaultCategory
          : this.defaultConfig.filters.defaultCategory,
        defaultPrintStatus: typeof config?.filters?.defaultPrintStatus === 'string' && config.filters.defaultPrintStatus.trim() !== ''
          ? config.filters.defaultPrintStatus
          : this.defaultConfig.filters.defaultPrintStatus,
        defaultLicense: typeof config?.filters?.defaultLicense === 'string' && config.filters.defaultLicense.trim() !== ''
          ? config.filters.defaultLicense
          : this.defaultConfig.filters.defaultLicense,
        defaultSortBy: typeof config?.filters?.defaultSortBy === 'string' && config.filters.defaultSortBy.trim() !== ''
          ? config.filters.defaultSortBy
          : this.defaultConfig.filters.defaultSortBy
      },
      lastModified: config?.lastModified || new Date().toISOString()
    };

    // Validate categories have required fields
    validatedConfig.categories = validatedConfig.categories.filter(cat => 
      cat.id && cat.label && cat.icon
    );

    // Ensure we have at least the default categories
    if (validatedConfig.categories.length === 0) {
      validatedConfig.categories = [...this.defaultConfig.categories];
    }

    return validatedConfig;
  }

  /**
   * Get a copy of the default configuration
   */
  static getDefaultConfig(): AppConfig {
    return JSON.parse(JSON.stringify(this.defaultConfig));
  }

  /**
   * Reset configuration to defaults
   */
  static resetConfig(): AppConfig {
    const defaultConfig = this.getDefaultConfig();
    this.saveConfig(defaultConfig);
    return defaultConfig;
  }

  /**
   * Load configuration from localStorage/file or return default config
   */
  static loadConfig(): AppConfig {
    const isNode = typeof window === 'undefined';

    console.debug('[ConfigManager] loadConfig() called, isNode=', isNode);

    if (isNode) {
      try {
        // @ts-ignore
        const fs = require('fs');
        // @ts-ignore
        const path = require('path');
        let configPath = path.join(process.cwd(), CONFIG_FILENAME);
        if (!fs.existsSync(configPath)) {
          configPath = path.join(process.cwd(), 'src/config/default-config.json');
        }
        const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const validated = this.validateConfig(fileConfig);
        return validated;
      } catch (e) {
        console.warn('Failed to load config from file:', e);
        return this.getDefaultConfig();
      }
    }

    try {
      const storedConfig = localStorage.getItem(STORAGE_KEY);
      console.debug('[ConfigManager] localStorage raw value for', STORAGE_KEY, storedConfig ? '(present)' : '(missing)');

      if (storedConfig) {
        try {
          const parsed = JSON.parse(storedConfig);
          const validatedConfig = this.validateConfig(parsed);
          console.debug('[ConfigManager] loaded and validated config from localStorage, lastModified=', validatedConfig.lastModified);
          return validatedConfig;
        } catch (parseError) {
          console.warn('[ConfigManager] Failed to parse stored config, resetting to default:', parseError);
          const defaultConfig = this.getDefaultConfig();
          this.saveConfig(defaultConfig); // Reset corrupt storage
          return defaultConfig;
        }
      } else {
        console.debug('[ConfigManager] No stored config found in localStorage');
      }
      
    } catch (error) {
      console.warn('Failed to load config from localStorage:', error);
    }
    
    const defaultConfig = this.getDefaultConfig();
    return defaultConfig;
  }

  /**
   * Save configuration to localStorage
   */
  static saveConfig(config: AppConfig): void {
    try {
      const validatedConfig = this.validateConfig(config);

      const jsonString = JSON.stringify(validatedConfig, null, 2);
      try {
        console.debug('[ConfigManager] Saving config to localStorage, lastModified=', validatedConfig.lastModified);
        localStorage.setItem(STORAGE_KEY, jsonString);
      } catch (err) {
        console.error('[ConfigManager] Failed to write to localStorage:', err);
        throw err;
      }
    } catch (error) {
      console.error('Failed to save config to localStorage:', error);
      throw error;
    }
  }

  /**
   * Import configuration from uploaded JSON file
   */
  static async importConfig(file: File): Promise<AppConfig> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const config = JSON.parse(content);
          const validatedConfig = this.validateConfig(config);
          resolve(validatedConfig);
        } catch (error) {
          reject(new Error('Invalid configuration file format'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read configuration file'));
      };
      
      reader.readAsText(file);
    });
  }

  /**
   * Export configuration as downloadable JSON file
   */
  static exportConfig(config: AppConfig): void {
    try {
      const configToExport = this.validateConfig(config);
      const blob = new Blob([JSON.stringify(configToExport, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = CONFIG_FILENAME;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export config:', error);
      throw error;
    }
  }

  /**
   * Get a setting value from config
   */
  static getSetting(key: string, defaultValue: any): any {
    try {
      const config = this.loadConfig();
      if (key === "theme") {
        return config.settings.defaultTheme;
      }
      return defaultValue;
    } catch (error) {
      console.warn('Failed to get setting:', key, error);
      return defaultValue;
    }
  }

  /**
   * Set a setting value in config
   */
  static setSetting(key: string, value: any): void {
    try {
      const config = this.loadConfig();
      if (key === "theme") {
        const validatedTheme = this.validateTheme(value);
        if (validatedTheme) {
          config.settings.defaultTheme = validatedTheme;
          this.saveConfig(config);
        }
      }
    } catch (error) {
      console.error('Failed to set setting:', key, error);
    }
  }
}
