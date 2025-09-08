"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
const CONFIG_FILENAME = "3d-model-muncher-config.json";
const STORAGE_KEY = "3d-model-muncher-config";
class ConfigManager {
    static validateTheme(theme) {
        return ["light", "dark", "system"].includes(theme) ? theme : undefined;
    }
    static validateView(view) {
        return ["grid", "list"].includes(view) ? view : undefined;
    }
    static validateModelView(view) {
        return ["3d", "images"].includes(view) ? view : undefined;
    }
    /**
     * Validate and merge configuration with defaults
     */
    static validateConfig(config) {
        var _a, _b, _c, _d, _e, _f, _g;
        const validatedConfig = {
            version: (config === null || config === void 0 ? void 0 : config.version) || this.defaultConfig.version,
            categories: Array.isArray(config === null || config === void 0 ? void 0 : config.categories) ? config.categories : this.defaultConfig.categories,
            settings: {
                defaultTheme: (() => {
                    var _a;
                    const theme = (_a = config === null || config === void 0 ? void 0 : config.settings) === null || _a === void 0 ? void 0 : _a.defaultTheme;
                    const validated = this.validateTheme(theme);
                    return validated !== undefined ? validated : this.defaultConfig.settings.defaultTheme;
                })(),
                defaultView: (() => {
                    var _a;
                    const view = (_a = config === null || config === void 0 ? void 0 : config.settings) === null || _a === void 0 ? void 0 : _a.defaultView;
                    const validated = this.validateView(view);
                    return validated !== undefined ? validated : this.defaultConfig.settings.defaultView;
                })(),
                defaultGridDensity: typeof ((_a = config === null || config === void 0 ? void 0 : config.settings) === null || _a === void 0 ? void 0 : _a.defaultGridDensity) === 'number' && !isNaN(config.settings.defaultGridDensity)
                    ? config.settings.defaultGridDensity
                    : this.defaultConfig.settings.defaultGridDensity,
                defaultModelView: (() => {
                    var _a;
                    const modelView = (_a = config === null || config === void 0 ? void 0 : config.settings) === null || _a === void 0 ? void 0 : _a.defaultModelView;
                    const validated = this.validateModelView(modelView);
                    return validated !== undefined ? validated : this.defaultConfig.settings.defaultModelView;
                })(),
                autoSave: ((_b = config === null || config === void 0 ? void 0 : config.settings) === null || _b === void 0 ? void 0 : _b.autoSave) !== undefined && config.settings.autoSave !== null
                    ? Boolean(config.settings.autoSave)
                    : this.defaultConfig.settings.autoSave,
                modelDirectory: typeof ((_c = config === null || config === void 0 ? void 0 : config.settings) === null || _c === void 0 ? void 0 : _c.modelDirectory) === 'string' && config.settings.modelDirectory.trim() !== ''
                    ? config.settings.modelDirectory
                    : this.defaultConfig.settings.modelDirectory,
                exportDirectory: typeof ((_d = config === null || config === void 0 ? void 0 : config.settings) === null || _d === void 0 ? void 0 : _d.exportDirectory) === 'string' && config.settings.exportDirectory.trim() !== ''
                    ? config.settings.exportDirectory
                    : this.defaultConfig.settings.exportDirectory
            },
            filters: {
                defaultCategory: typeof ((_e = config === null || config === void 0 ? void 0 : config.filters) === null || _e === void 0 ? void 0 : _e.defaultCategory) === 'string' && config.filters.defaultCategory.trim() !== ''
                    ? config.filters.defaultCategory
                    : this.defaultConfig.filters.defaultCategory,
                defaultPrintStatus: typeof ((_f = config === null || config === void 0 ? void 0 : config.filters) === null || _f === void 0 ? void 0 : _f.defaultPrintStatus) === 'string' && config.filters.defaultPrintStatus.trim() !== ''
                    ? config.filters.defaultPrintStatus
                    : this.defaultConfig.filters.defaultPrintStatus,
                defaultLicense: typeof ((_g = config === null || config === void 0 ? void 0 : config.filters) === null || _g === void 0 ? void 0 : _g.defaultLicense) === 'string' && config.filters.defaultLicense.trim() !== ''
                    ? config.filters.defaultLicense
                    : this.defaultConfig.filters.defaultLicense
            },
            lastModified: (config === null || config === void 0 ? void 0 : config.lastModified) || new Date().toISOString()
        };
        // Validate categories have required fields
        validatedConfig.categories = validatedConfig.categories.filter(cat => cat.id && cat.label && cat.icon);
        // Ensure we have at least the default categories
        if (validatedConfig.categories.length === 0) {
            validatedConfig.categories = [...this.defaultConfig.categories];
        }
        return validatedConfig;
    }
    /**
     * Get a copy of the default configuration
     */
    static getDefaultConfig() {
        return JSON.parse(JSON.stringify(this.defaultConfig));
    }
    /**
     * Reset configuration to defaults
     */
    static resetConfig() {
        const defaultConfig = this.getDefaultConfig();
        this.saveConfig(defaultConfig);
        return defaultConfig;
    }
    /**
     * Load configuration from localStorage/file or return default config
     */
    static loadConfig() {
        const isNode = typeof window === 'undefined';
        if (isNode) {
            try {
                // @ts-ignore
                const fs = require('fs');
                // @ts-ignore
                const path = require('path');
                let configPath = path.join(__dirname, '../config/default-config.json');
                if (!fs.existsSync(configPath)) {
                    configPath = path.join(process.cwd(), 'src/config/default-config.json');
                }
                const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                const validated = this.validateConfig(fileConfig);
                return validated;
            }
            catch (e) {
                console.warn('Failed to load config from file:', e);
                return this.getDefaultConfig();
            }
        }
        try {
            const storedConfig = localStorage.getItem(STORAGE_KEY);
            if (storedConfig) {
                try {
                    const parsed = JSON.parse(storedConfig);
                    const validatedConfig = this.validateConfig(parsed);
                    return validatedConfig;
                }
                catch (parseError) {
                    console.warn('Failed to parse stored config, using default:', parseError);
                    const defaultConfig = this.getDefaultConfig();
                    this.saveConfig(defaultConfig); // Reset corrupt storage
                    return defaultConfig;
                }
            }
        }
        catch (error) {
            console.warn('Failed to load config from localStorage:', error);
        }
        const defaultConfig = this.getDefaultConfig();
        return defaultConfig;
    }
    /**
     * Save configuration to localStorage
     */
    static saveConfig(config) {
        try {
            const validatedConfig = this.validateConfig(config);
            const jsonString = JSON.stringify(validatedConfig, null, 2);
            localStorage.setItem(STORAGE_KEY, jsonString);
        }
        catch (error) {
            console.error('Failed to save config to localStorage:', error);
            throw error;
        }
    }
    /**
     * Import configuration from uploaded JSON file
     */
    static async importConfig(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                var _a;
                try {
                    const content = (_a = event.target) === null || _a === void 0 ? void 0 : _a.result;
                    const config = JSON.parse(content);
                    const validatedConfig = this.validateConfig(config);
                    resolve(validatedConfig);
                }
                catch (error) {
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
    static exportConfig(config) {
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
        }
        catch (error) {
            console.error('Failed to export config:', error);
            throw error;
        }
    }
    /**
     * Get a setting value from config
     */
    static getSetting(key, defaultValue) {
        try {
            const config = this.loadConfig();
            if (key === "theme") {
                return config.settings.defaultTheme;
            }
            return defaultValue;
        }
        catch (error) {
            console.warn('Failed to get setting:', key, error);
            return defaultValue;
        }
    }
    /**
     * Set a setting value in config
     */
    static setSetting(key, value) {
        try {
            const config = this.loadConfig();
            if (key === "theme") {
                const validatedTheme = this.validateTheme(value);
                if (validatedTheme) {
                    config.settings.defaultTheme = validatedTheme;
                    this.saveConfig(config);
                }
            }
        }
        catch (error) {
            console.error('Failed to set setting:', key, error);
        }
    }
}
exports.ConfigManager = ConfigManager;
ConfigManager.defaultConfig = {
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
