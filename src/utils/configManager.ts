import { AppConfig } from "../types/config";

const CONFIG_FILENAME = "3d-model-muncher-config.json";

export class ConfigManager {
  private static defaultConfig: AppConfig = {
    version: "1.0.0",
    categories: [
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
      defaultModelView: "3d",
      autoSave: true,
      modelDirectory: "./models",
      exportDirectory: "./exports"
    },
    filters: {
      defaultCategory: "all",
      defaultPrintStatus: "all",
      defaultLicense: "all"
    },
    lastModified: new Date().toISOString()
  };

  /**
   * Load configuration from localStorage (fallback) or return default config
   */
  static loadConfig(): AppConfig {
    const isNode = typeof window === 'undefined';
    if (isNode) {
      // Node.js: use fs
      try {
        // @ts-ignore
        const fs = require('fs');
        // @ts-ignore
        const path = require('path');
        let configPath = path.join(__dirname, '../config/default-config.json');
        if (!fs.existsSync(configPath)) {
          // fallback to src/config if not found in dist-backend/config
          configPath = path.join(process.cwd(), 'src/config/default-config.json');
        }
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Failed to load config from file:', e);
        return {} as AppConfig;
      }
    } else {
      // Browser: use localStorage
      try {
        const storedConfig = localStorage.getItem('3d-model-muncher-config');
        if (storedConfig) {
          const parsed = JSON.parse(storedConfig);
          return this.validateConfig(parsed);
        }
      } catch (error) {
        console.warn('Failed to load config from localStorage:', error);
      }
      try {
        const stored = localStorage.getItem('appConfig');
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Failed to load config from localStorage:', e);
      }
      return {} as AppConfig;
    }
  }

  /**
   * Save configuration to localStorage
   */
  static saveConfig(config: AppConfig): void {
    try {
      const configToSave = {
        ...config,
        lastModified: new Date().toISOString()
      };
      localStorage.setItem('3d-model-muncher-config', JSON.stringify(configToSave, null, 2));
    } catch (error) {
      console.error('Failed to save config to localStorage:', error);
      throw new Error('Failed to save configuration');
    }
  }

  /**
   * Export configuration as downloadable JSON file
   */
  static exportConfig(config: AppConfig): void {
    try {
      const configToExport = {
        ...config,
        lastModified: new Date().toISOString()
      };
      
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
      throw new Error('Failed to export configuration');
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
   * Validate and merge configuration with defaults
   */
  private static validateConfig(config: any): AppConfig {
    const validatedConfig: AppConfig = {
      version: config.version || this.defaultConfig.version,
      categories: Array.isArray(config.categories) ? config.categories : this.defaultConfig.categories,
      settings: {
        defaultTheme: config.settings?.defaultTheme || this.defaultConfig.settings.defaultTheme,
        defaultView: config.settings?.defaultView || this.defaultConfig.settings.defaultView,
        defaultGridDensity: config.settings?.defaultGridDensity || this.defaultConfig.settings.defaultGridDensity,
        defaultModelView: config.settings?.defaultModelView || this.defaultConfig.settings.defaultModelView,
        autoSave: config.settings?.autoSave !== undefined ? config.settings.autoSave : this.defaultConfig.settings.autoSave,
        modelDirectory: config.settings?.modelDirectory || this.defaultConfig.settings.modelDirectory,
        exportDirectory: config.settings?.exportDirectory || this.defaultConfig.settings.exportDirectory
      },
      filters: {
        defaultCategory: config.filters?.defaultCategory || this.defaultConfig.filters.defaultCategory,
        defaultPrintStatus: config.filters?.defaultPrintStatus || this.defaultConfig.filters.defaultPrintStatus,
        defaultLicense: config.filters?.defaultLicense || this.defaultConfig.filters.defaultLicense
      },
      lastModified: config.lastModified || new Date().toISOString()
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
   * Reset configuration to defaults
   */
  static resetConfig(): AppConfig {
    const resetConfig = { ...this.defaultConfig };
    this.saveConfig(resetConfig);
    return resetConfig;
  }

  /**
   * Get default configuration
   */
  static getDefaultConfig(): AppConfig {
    return { ...this.defaultConfig };
  }
}