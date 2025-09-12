import { Category } from "./category";

export interface AppConfig {
  version: string;
  categories: Category[];
  settings: {
    defaultTheme: "light" | "dark" | "system";
    defaultView: "grid" | "list";
    defaultGridDensity: number;
    defaultModelView: "3d" | "images";
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