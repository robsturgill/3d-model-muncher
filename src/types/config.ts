import { Category } from "./category";

export interface AppConfig {
  version: string;
  categories: Category[];
  settings: {
    defaultTheme: "light" | "dark" | "system";
    defaultView: "grid" | "list";
    defaultGridDensity: number;
    defaultModelView: "3d" | "images";
    defaultModelColor?: string;
    showPrintedBadge?: boolean;
    verboseScanLogs?: boolean;
    modelCardPrimary: 'none' | 'printTime' | 'filamentUsed' | 'fileSize' | 'category' | 'designer' | 'layerHeight' | 'nozzle' | 'price';
    modelCardSecondary: 'none' | 'printTime' | 'filamentUsed' | 'fileSize' | 'category' | 'designer' | 'layerHeight' | 'nozzle' | 'price';
    autoSave: boolean;
    modelDirectory: string;
  };
  filters: {
    defaultCategory: string;
    defaultPrintStatus: string;
    defaultLicense: string;
  };
  lastModified: string;
}