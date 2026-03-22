import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { ConfigManager } from '../src/utils/configManager';
import type { AppConfig } from '../src/types/config';

describe('ConfigManager filters.defaultSortBy', () => {
  // Provide a minimal localStorage mock for Node test environment
  const memoryStore: Record<string, string> = {};
  beforeAll(() => {
    globalThis.localStorage = {
      getItem: (k: string) => memoryStore[k] ?? null,
      setItem: (k: string, v: string) => { memoryStore[k] = String(v); },
      removeItem: (k: string) => { delete memoryStore[k]; },
      clear: () => { Object.keys(memoryStore).forEach(k => delete memoryStore[k]); },
      key: (i: number) => Object.keys(memoryStore)[i] ?? null,
      length: 0,
    } as any;
  });

  it('default config includes filters.defaultSortBy = "none"', () => {
    const def = ConfigManager.getDefaultConfig();
    expect(def.filters.defaultSortBy).toBe('none');
  });

  it('validateConfig sets defaultSortBy to default when missing', () => {
    // Ensure loadConfig reads from localStorage path
    // @ts-ignore
    globalThis.window = {} as any;
    const input: Partial<AppConfig> = {
      version: '1.0.0',
      categories: [],
      settings: {
        defaultTheme: 'system',
        defaultView: 'grid',
        defaultGridDensity: 4,
        defaultModelView: 'images',
        autoSave: true,
        modelDirectory: './models',
        modelCardPrimary: 'printTime',
        modelCardSecondary: 'filamentUsed',
      } as any,
      filters: {
        defaultCategory: 'all',
        defaultPrintStatus: 'all',
        defaultLicense: 'all',
        // defaultSortBy intentionally omitted
      } as any,
      lastModified: new Date().toISOString(),
    };

    // private method not exported, but load/save trigger validation
    // Save then load to force validation path
    ConfigManager.saveConfig(input as AppConfig);
    const cfg = ConfigManager.loadConfig();

    expect(cfg.filters.defaultSortBy).toBe('none');
  });

  it('validateConfig preserves provided defaultSortBy', () => {
    // Ensure loadConfig reads from localStorage path
    // @ts-ignore
    globalThis.window = {} as any;
    const input: Partial<AppConfig> = {
      version: '1.0.0',
      categories: [],
      settings: {
        defaultTheme: 'system',
        defaultView: 'grid',
        defaultGridDensity: 4,
        defaultModelView: 'images',
        autoSave: true,
        modelDirectory: './models',
        modelCardPrimary: 'printTime',
        modelCardSecondary: 'filamentUsed',
      } as any,
      filters: {
        defaultCategory: 'all',
        defaultPrintStatus: 'all',
        defaultLicense: 'all',
        defaultSortBy: 'modified_desc',
      },
      lastModified: new Date().toISOString(),
    };

    ConfigManager.saveConfig(input as AppConfig);
    const cfg = ConfigManager.loadConfig();

    expect(cfg.filters.defaultSortBy).toBe('modified_desc');
  });
});

describe('ConfigManager settings.categorySortOrder', () => {
  const memoryStore: Record<string, string> = {};

  beforeAll(() => {
    globalThis.localStorage = {
      getItem: (k: string) => memoryStore[k] ?? null,
      setItem: (k: string, v: string) => { memoryStore[k] = String(v); },
      removeItem: (k: string) => { delete memoryStore[k]; },
      clear: () => { Object.keys(memoryStore).forEach(k => delete memoryStore[k]); },
      key: (i: number) => Object.keys(memoryStore)[i] ?? null,
      length: 0,
    } as any;
    // @ts-ignore
    globalThis.window = {} as any;
  });

  beforeEach(() => {
    Object.keys(memoryStore).forEach(k => delete memoryStore[k]);
  });

  it('default config has categorySortOrder = "custom"', () => {
    const def = ConfigManager.getDefaultConfig();
    expect(def.settings.categorySortOrder).toBe('custom');
  });

  it('preserves categorySortOrder "alpha" through save/load round-trip', () => {
    const input = ConfigManager.getDefaultConfig();
    input.settings.categorySortOrder = 'alpha';
    ConfigManager.saveConfig(input);
    const cfg = ConfigManager.loadConfig();
    expect(cfg.settings.categorySortOrder).toBe('alpha');
  });

  it('preserves categorySortOrder "custom" through save/load round-trip', () => {
    const input = ConfigManager.getDefaultConfig();
    input.settings.categorySortOrder = 'custom';
    ConfigManager.saveConfig(input);
    const cfg = ConfigManager.loadConfig();
    expect(cfg.settings.categorySortOrder).toBe('custom');
  });

  it('defaults to "custom" when categorySortOrder is missing from stored config', () => {
    const input = ConfigManager.getDefaultConfig();
    delete (input.settings as any).categorySortOrder;
    ConfigManager.saveConfig(input as AppConfig);
    const cfg = ConfigManager.loadConfig();
    expect(cfg.settings.categorySortOrder).toBe('custom');
  });

  it('defaults to "custom" when categorySortOrder is an invalid value', () => {
    const input = ConfigManager.getDefaultConfig();
    (input.settings as any).categorySortOrder = 'invalid';
    ConfigManager.saveConfig(input as AppConfig);
    const cfg = ConfigManager.loadConfig();
    expect(cfg.settings.categorySortOrder).toBe('custom');
  });
});
