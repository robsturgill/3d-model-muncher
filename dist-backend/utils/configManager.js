"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
const CONFIG_FILENAME = "3d-model-muncher-config.json";
class ConfigManager {
    /**
     * Load configuration from localStorage (fallback) or return default config
     */
    static loadConfig() {
        try {
            const storedConfig = localStorage.getItem('3d-model-muncher-config');
            if (storedConfig) {
                const parsed = JSON.parse(storedConfig);
                return this.validateConfig(parsed);
            }
        }
        catch (error) {
            console.warn('Failed to load config from localStorage:', error);
        }
        return { ...this.defaultConfig };
    }
    /**
     * Save configuration to localStorage
     */
    static saveConfig(config) {
        try {
            const configToSave = {
                ...config,
                lastModified: new Date().toISOString()
            };
            localStorage.setItem('3d-model-muncher-config', JSON.stringify(configToSave, null, 2));
        }
        catch (error) {
            console.error('Failed to save config to localStorage:', error);
            throw new Error('Failed to save configuration');
        }
    }
    /**
     * Export configuration as downloadable JSON file
     */
    static exportConfig(config) {
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
        }
        catch (error) {
            console.error('Failed to export config:', error);
            throw new Error('Failed to export configuration');
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
     * Validate and merge configuration with defaults
     */
    static validateConfig(config) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const validatedConfig = {
            version: config.version || this.defaultConfig.version,
            categories: Array.isArray(config.categories) ? config.categories : this.defaultConfig.categories,
            settings: {
                defaultTheme: ((_a = config.settings) === null || _a === void 0 ? void 0 : _a.defaultTheme) || this.defaultConfig.settings.defaultTheme,
                defaultView: ((_b = config.settings) === null || _b === void 0 ? void 0 : _b.defaultView) || this.defaultConfig.settings.defaultView,
                defaultGridDensity: ((_c = config.settings) === null || _c === void 0 ? void 0 : _c.defaultGridDensity) || this.defaultConfig.settings.defaultGridDensity,
                defaultModelView: ((_d = config.settings) === null || _d === void 0 ? void 0 : _d.defaultModelView) || this.defaultConfig.settings.defaultModelView,
                autoSave: ((_e = config.settings) === null || _e === void 0 ? void 0 : _e.autoSave) !== undefined ? config.settings.autoSave : this.defaultConfig.settings.autoSave,
                modelDirectory: ((_f = config.settings) === null || _f === void 0 ? void 0 : _f.modelDirectory) || this.defaultConfig.settings.modelDirectory,
                exportDirectory: ((_g = config.settings) === null || _g === void 0 ? void 0 : _g.exportDirectory) || this.defaultConfig.settings.exportDirectory
            },
            filters: {
                defaultCategory: ((_h = config.filters) === null || _h === void 0 ? void 0 : _h.defaultCategory) || this.defaultConfig.filters.defaultCategory,
                defaultPrintStatus: ((_j = config.filters) === null || _j === void 0 ? void 0 : _j.defaultPrintStatus) || this.defaultConfig.filters.defaultPrintStatus,
                defaultLicense: ((_k = config.filters) === null || _k === void 0 ? void 0 : _k.defaultLicense) || this.defaultConfig.filters.defaultLicense
            },
            lastModified: config.lastModified || new Date().toISOString()
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
     * Reset configuration to defaults
     */
    static resetConfig() {
        const resetConfig = { ...this.defaultConfig };
        this.saveConfig(resetConfig);
        return resetConfig;
    }
    /**
     * Get default configuration
     */
    static getDefaultConfig() {
        return { ...this.defaultConfig };
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
