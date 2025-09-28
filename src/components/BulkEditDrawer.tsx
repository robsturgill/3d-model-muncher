import { useState, useEffect } from "react";
import { Model } from "../types/model";
import { Category } from "../types/category";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "./ui/sheet";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { LICENSES, type License } from '../constants/licenses';
import { Switch } from "./ui/switch";
import { Separator } from "./ui/separator";
import { Checkbox } from "./ui/checkbox";
import { Alert, AlertTitle, AlertDescription } from "./ui/alert";
import {
  Save,
  X,
  Users,
  Tag,
  Globe,
  StickyNote,
  FileText,
  CheckCircle,
  XCircle,
  DollarSign,
  EyeOff,
  Eye,
  Clock,
  Weight,
  RefreshCw,
  Layers,
  CircleCheckBig
} from "lucide-react";
import { ImagePlus } from "lucide-react";
import { RendererPool } from "../utils/rendererPool";
import { AlertCircle } from "lucide-react";

interface BulkEditDrawerProps {
  models: Model[];
  isOpen: boolean;
  onClose: () => void;
  onBulkUpdate: (updates: Partial<Model>) => void;
  onRefresh?: () => Promise<void>;
  // Optional callback to provide the exact updated models after saving. If provided,
  // the parent can merge them into its state without a full re-fetch.
  onBulkSaved?: (updatedModels: Model[]) => void;
  // Optional per-model updater (same shape as ModelDetailsDrawer) to allow updating a single model
  // in the parent state immediately after it's saved.
  onModelUpdate?: (model: Model) => void;
  onClearSelections?: () => void;
  categories: Category[];
  // Optional configured models directory (from app config). Used to
  // normalize related file paths when saving (strip leading directory).
  modelDirectory?: string;
}

interface BulkEditState {
  category?: string;
  license?: License | string;
  designer?: string;
  isPrinted?: boolean;
  hidden?: boolean;
  tags?: {
    add: string[];
    remove: string[];
  };
  notes?: string;
  source?: string;
  price?: number;
  printTime?: string;
  filamentUsed?: string;
  // Related files: which model id is primary, whether to hide others, and which ids are included
  relatedPrimary?: string;
  relatedHideOthers?: boolean;
  relatedIncluded?: string[];
  relatedClearAll?: boolean;
}

interface FieldSelection {
  category: boolean;
  license: boolean;
  designer: boolean;
  isPrinted: boolean;
  hidden: boolean;
  tags: boolean;
  notes: boolean;
  source: boolean;
  price: boolean;
  printTime: boolean;
  filamentUsed: boolean;
  regenerateMunchie: boolean;
  relatedFiles: boolean;
}

export function BulkEditDrawer({
  models,
  isOpen,
  onClose,
  onBulkUpdate,
  onRefresh,
  onBulkSaved,
  onModelUpdate,
  onClearSelections,
  categories,
  modelDirectory,
}: BulkEditDrawerProps) {
  // keep categories referenced to avoid TypeScript unused prop error (it's passed from parent)
  void categories;
  // keep onModelUpdate referenced to avoid unused prop linting when it's not needed here
  void onModelUpdate;
  const [editState, setEditState] = useState<BulkEditState>({});
  const [fieldSelection, setFieldSelection] =
    useState<FieldSelection>({
      category: false,
      license: false,
      designer: false,
      isPrinted: false,
      hidden: false,
      tags: false,
      notes: false,
      source: false,
      price: false,
      printTime: false,
      filamentUsed: false,
      regenerateMunchie: false,
      relatedFiles: false,
    });
  const [newTag, setNewTag] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [closeRequestedWhileGenerating, setCloseRequestedWhileGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  // renderer pool is used for offscreen captures; keep lightweight state for progress

  // Track which of the selected models are included in the related-files group
  const [relatedIncludedIds, setRelatedIncludedIds] = useState<string[]>([]);

  // Generate a stable unique key for a model for use in related-files UI/state.
  // Prefer modelUrl (most specific), then filePath, then fallback to id::name to
  // ensure models that only differ by extension (e.g. .3mf vs .stl) are distinct.
  const uniqueKeyForModel = (m: Model) => {
    if (!m) return "";
    if (m.modelUrl) return m.modelUrl;
    if (m.filePath) return m.filePath;
    return `${m.id}::${m.name}`;
  };

  // Available licenses (centralized)
  const availableLicenses = LICENSES;

  // Get common values across selected models
  const getCommonValues = () => {
    if (models.length === 0) return {};

    const firstModel = models[0];
    const common: any = {};

    // Check category
    if (
      models.every(
        (model) => model.category === firstModel.category,
      )
    ) {
      common.category = firstModel.category;
    }

    // Check license
    if (
      models.every(
        (model) => model.license === firstModel.license,
      )
    ) {
      common.license = firstModel.license;
    }

    // Check print status
    if (
      models.every(
        (model) => model.isPrinted === firstModel.isPrinted,
      )
    ) {
      common.isPrinted = firstModel.isPrinted;
    }

    // Check hidden status
    if (
      models.every(
        (model) => model.hidden === firstModel.hidden,
      )
    ) {
      common.hidden = firstModel.hidden;
    }

    // Check printTime
    if (
      models.every((model) => model.printTime === firstModel.printTime)
    ) {
      common.printTime = firstModel.printTime;
    }

    // Check designer
    if (
      models.every((model) => model.designer === firstModel.designer)
    ) {
      common.designer = firstModel.designer;
    }

    // Check filamentUsed
    if (
      models.every((model) => model.filamentUsed === firstModel.filamentUsed)
    ) {
      common.filamentUsed = firstModel.filamentUsed;
    }

    return common;
  };

  const getAllTags = () => {
    const allTags = new Set<string>();
    models.forEach((model) => {
      (model.tags || []).forEach((tag) => allTags.add(tag));
    });
    return Array.from(allTags).sort();
  };

  const commonValues = getCommonValues();
  const allTags = getAllTags();

  // Reset state when models change or drawer opens
  useEffect(() => {
    if (isOpen) {
      setEditState({
        tags: { add: [], remove: [] },
        // use stable unique keys so two files with the same name but different
        // extensions don't collapse into one entry
        relatedIncluded: models.map((m) => uniqueKeyForModel(m)),
        relatedPrimary: models.length > 0 ? uniqueKeyForModel(models[0]) : undefined,
        relatedHideOthers: false,
        relatedClearAll: false,
      });
      setFieldSelection({
        category: false,
        license: false,
        designer: false,
        isPrinted: false,
        hidden: false,
        tags: false,
        notes: false,
        source: false,
        price: false,
        printTime: false,
        filamentUsed: false,
        regenerateMunchie: false,
        relatedFiles: false,
      });
      setNewTag("");
      setRelatedIncludedIds(models.map((m) => uniqueKeyForModel(m)));
      // Clear any leftover image-generation state so alerts don't persist
      setIsGeneratingImages(false);
      setCloseRequestedWhileGenerating(false);
      setGenerateProgress({ current: 0, total: 0 });
    }
  }, [isOpen, models]);

  const handleFieldToggle = (field: keyof FieldSelection) => {
    setFieldSelection((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));

    // Clear the field value if unchecked (except for regenerateMunchie which is an action, not a value)
    if (fieldSelection[field] && field !== 'regenerateMunchie') {
      setEditState((prev) => {
        const newState = { ...prev };
        delete (newState as any)[field];
        return newState;
      });
    }
  };

  const handleCategoryChange = (value: string) => {
    setEditState((prev) => ({ ...prev, category: value }));
  };

  const handleLicenseChange = (value: string) => {
    setEditState((prev) => ({ ...prev, license: value }));
  };

  const handleDesignerChange = (value: string) => {
    setEditState((prev) => ({ ...prev, designer: value }));
  };

  const handlePrintStatusChange = (checked: boolean) => {
    setEditState((prev) => ({ ...prev, isPrinted: checked }));
  };

  const handleHiddenChange = (checked: boolean) => {
    setEditState((prev) => ({ ...prev, hidden: checked }));
  };

  const handleNotesChange = (value: string) => {
    setEditState((prev) => ({ ...prev, notes: value }));
  };

  const handleSourceChange = (value: string) => {
    setEditState((prev) => ({ ...prev, source: value }));
  };

  const handlePriceChange = (value: string) => {
    setEditState((prev) => ({ 
      ...prev, 
      price: value ? parseFloat(value) : undefined 
    }));
  };

  const handlePrintTimeChange = (value: string) => {
    setEditState((prev) => ({ ...prev, printTime: value }));
  };

  const handleFilamentChange = (value: string) => {
    setEditState((prev) => ({ ...prev, filamentUsed: value }));
  };

  // related-files state is managed inline in the UI handlers

  const handleAddTag = () => {
    if (!newTag.trim()) return;

    const trimmedTag = newTag.trim();
    setEditState((prev) => {
      const currentAdds = prev.tags?.add || [];
      const currentRemoves = prev.tags?.remove || [];

      // Prevent duplicates: check case-insensitively against currentAdds and allTags
      const lowerNew = trimmedTag.toLowerCase();
      const existingInAdds = currentAdds.some(t => t.toLowerCase() === lowerNew);
      const existingInAllTags = allTags.some(t => t.toLowerCase() === lowerNew);

      if (existingInAdds || existingInAllTags) {
        // If tag is present in remove list, ensure it's removed from remove list
        return {
          ...prev,
          tags: {
            add: currentAdds,
            remove: currentRemoves.filter((tag) => tag.toLowerCase() !== lowerNew),
          },
        };
      }

      return {
        ...prev,
        tags: {
          add: [...currentAdds, trimmedTag],
          remove: currentRemoves.filter((tag) => tag.toLowerCase() !== lowerNew),
        },
      };
    });
    setNewTag("");
  };

  const handleRemoveTagFromAdd = (tagToRemove: string) => {
    setEditState((prev) => ({
      ...prev,
      tags: {
        add: (prev.tags?.add || []).filter(
          (tag) => tag !== tagToRemove,
        ),
        remove: prev.tags?.remove || [],
      },
    }));
  };

  const handleToggleTagRemoval = (tag: string) => {
    setEditState((prev) => {
      const currentRemove = prev.tags?.remove || [];
      const isRemoving = currentRemove.includes(tag);

      return {
        ...prev,
        tags: {
          add: prev.tags?.add || [],
          remove: isRemoving
            ? currentRemove.filter((t) => t !== tag)
            : [...currentRemove, tag],
        },
      };
    });
  };

  // Helper to send only changed fields to backend
  const saveModelToFile = async (edited: Model, original: Model) => {
    if (!edited.filePath) {
      console.error("No filePath specified for model");
      return;
    }
    // Compute changed fields
    const changes: any = { filePath: edited.filePath, id: edited.id };
    Object.keys(edited).forEach(key => {
      if (key === 'filePath' || key === 'id') return;
      const editedValue = JSON.stringify((edited as any)[key]);
      const originalValue = JSON.stringify((original as any)[key]);
      if (editedValue !== originalValue) {
        changes[key] = (edited as any)[key];
      }
    });
    // Always send userDefined.images and imageOrder if present (for image generation)
    if (edited.userDefined && Array.isArray(edited.userDefined.images)) {
      if (!changes.userDefined) changes.userDefined = {};
      changes.userDefined.images = edited.userDefined.images;
    }
    if (edited.userDefined && Array.isArray(edited.userDefined.imageOrder)) {
      if (!changes.userDefined) changes.userDefined = {};
      changes.userDefined.imageOrder = edited.userDefined.imageOrder;
    }
    // Migrate description into userDefined for consistency with other components
    if (typeof changes.description !== 'undefined') {
      const desc = changes.description;
      if (!changes.userDefined) changes.userDefined = {};
      changes.userDefined.description = desc;
      delete changes.description;
    }
    
    console.debug(`[BulkEdit] Saving model ${edited.name} with changes:`, changes);
    
    try {
      const response = await fetch('/api/save-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes)
      });
      const result = await response.json();
      console.debug(`[BulkEdit] Save result for ${edited.name}:`, result);
      if (!result.success) {
        throw new Error(result.error || 'Failed to save model');
      }
      // Return the server result so callers can use the authoritative refreshed model
      return result;
    } catch (err) {
      console.error(`[BulkEdit] Failed to save model ${edited.name} to file:`, err);
      return { success: false, error: String(err) } as any;
    }
  };

  // Utility: determine if a model already has any images
  const modelHasImage = (m: Model) => {
    if (!m) return false;
    if (m.thumbnail) return true;
    if (m.images && m.images.length > 0) return true;
    if (m.parsedImages && m.parsedImages.length > 0) return true;
    if (m.userDefined && m.userDefined.images && m.userDefined.images.length > 0) return true;
    return false;
  };

  // ...existing code...

  // RendererPool handles creating its own offscreen container when needed.
  // Keep the hiddenViewerId for traceability/debug logs.

  // Generate image(s) for selected models that do not have images. This will
  // render a hidden ModelViewer3D (offscreen) and use canvas.toDataURL to capture
  // a PNG, then save into the model's userDefined.images and persist via saveModelToFile.
  const handleGenerateImages = async (): Promise<Model[]> => {
    if (isGeneratingImages) return [];
    const toProcess = models.filter(m => !modelHasImage(m));
    if (toProcess.length === 0) return [];

    // Use the RendererPool to perform offscreen captures; it serializes use of the
    // single WebGL renderer so we don't need to forcibly unregister other viewers.

    setIsGeneratingImages(true);
    setGenerateProgress({ current: 0, total: toProcess.length });

    const savedModels: Model[] = [];
    for (let i = 0; i < toProcess.length; i++) {
      const model = toProcess[i];
      let modelUrl = model.modelUrl;
      if (!modelUrl && model.filePath) {
        modelUrl = `/models/${model.filePath.replace(/\\/g, '/')}`;
      }

      let dataUrl: string | null = null;
      try {
        dataUrl = await RendererPool.captureModel(modelUrl);
      } catch (err) {
        console.warn('[BulkEdit] RendererPool capture failed for', model.name, err);
      }

      if (!dataUrl) {
        console.warn(`[BulkEdit] Could not capture image for ${model.name}, skipping`);
        setGenerateProgress(prev => ({ ...prev, current: prev.current + 1 }));
        continue;
      }

      const updatedModel = { ...model } as Model;
      if (!updatedModel.userDefined || typeof updatedModel.userDefined !== 'object') updatedModel.userDefined = {} as any;
      const existingImages = Array.isArray((updatedModel.userDefined as any).images) ? (updatedModel.userDefined as any).images : [];
      (updatedModel.userDefined as any).images = [...existingImages, dataUrl];
      const imageOrder = Array.isArray((updatedModel.userDefined as any).imageOrder) ? (updatedModel.userDefined as any).imageOrder : [];
      const newIndex = existingImages.length;
      (updatedModel.userDefined as any).imageOrder = [...imageOrder, `user:${newIndex}`];

      if (!updatedModel.filePath && updatedModel.modelUrl) {
        let rel = updatedModel.modelUrl.replace('/models/', '');
        if (rel.endsWith('.3mf')) rel = rel.replace('.3mf', '-munchie.json');
        else if (rel.endsWith('.stl')) rel = rel.replace('.stl', '-stl-munchie.json');
        else rel = `${rel}-munchie.json`;
        updatedModel.filePath = rel;
      }

      console.debug(`[BulkEdit] Saving image for model: ${updatedModel.name}, filePath: ${updatedModel.filePath}, imagesCount:`, (updatedModel.userDefined as any).images?.length || 0);

      // Save the model and collect the authoritative saved model for caller to consume
      const saveResult: any = await saveModelToFile(updatedModel, model);
      let modelForParent: Model = updatedModel;
      if (saveResult && saveResult.success && saveResult.refreshedModel) {
        modelForParent = saveResult.refreshedModel as Model;
      }
      savedModels.push(modelForParent);
      setGenerateProgress({ current: i + 1, total: toProcess.length });
    }

    setIsGeneratingImages(false);

    // If the user requested close while generation ran, close now
    if (closeRequestedWhileGenerating) {
      setCloseRequestedWhileGenerating(false);
      try {
        onClose();
      } catch (err) {
        console.error('Error closing after image generation:', err);
      }
    }

    return savedModels;
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const updates: Partial<Model> = {};

      // Apply selected fields
      if (fieldSelection.category && editState.category) {
        updates.category = editState.category;
      }

      if (fieldSelection.license && editState.license) {
        updates.license = editState.license;
      }

      if (fieldSelection.designer && editState.designer !== undefined) {
        updates.designer = editState.designer;
      }

      if (
        fieldSelection.isPrinted &&
        editState.isPrinted !== undefined
      ) {
        updates.isPrinted = editState.isPrinted;
      }

      if (
        fieldSelection.hidden &&
        editState.hidden !== undefined
      ) {
        updates.hidden = editState.hidden;
      }

      if (fieldSelection.notes && editState.notes !== undefined) {
        updates.notes = editState.notes;
      }

      if (
        fieldSelection.source &&
        editState.source !== undefined
      ) {
        updates.source = editState.source;
      }

      if (
        fieldSelection.price &&
        editState.price !== undefined
      ) {
        updates.price = editState.price;
      }

      if (
        fieldSelection.printTime &&
        editState.printTime !== undefined
      ) {
        updates.printTime = editState.printTime;
      }

      if (
        fieldSelection.filamentUsed &&
        editState.filamentUsed !== undefined
      ) {
        updates.filamentUsed = editState.filamentUsed;
      }

      // Handle tags separately since it requires special logic
      if (fieldSelection.tags && editState.tags) {
        // This will be handled in the parent component
        (updates as any).bulkTagChanges = editState.tags;
      }

      // Handle regenerate munchie files first if selected
      if (fieldSelection.regenerateMunchie) {
        try {
          const modelIds = models.map(model => model.id);
          const response = await fetch('/api/regenerate-munchie-files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modelIds })
          });
          
          const result = await response.json();
          if (!result.success) {
            throw new Error(result.error || 'Failed to regenerate munchie files');
          }
          
          console.log(`Regenerated ${result.processed} munchie files`);
          
          // Refresh model data after regeneration
          if (onRefresh) {
            await onRefresh();
          }
          
          // Clear selections after regeneration
          if (onClearSelections) {
            onClearSelections();
          }
          
          // If regeneration was the only action, close and return
          if (Object.keys(updates).length === 0) {
            onClose();
            return;
          }
        } catch (error) {
          console.error('Failed to regenerate munchie files:', error);
          throw error; // Re-throw to be caught by outer try-catch
        }
      }

      // Update UI state
      onBulkUpdate(updates);

      // Save each model to its respective file
      console.debug(`[BulkEdit] Processing ${models.length} models for bulk save`);
      
  const savedModels: Model[] = [];
  for (const model of models) {
        // Ensure filePath is present for saving - convert to JSON file path
        let jsonFilePath;
        if (model.filePath) {
          // Always convert model file paths to munchie.json paths before saving
          if (model.filePath.endsWith('.3mf')) {
            jsonFilePath = model.filePath.replace(/\.3mf$/i, '-munchie.json');
          } else if (model.filePath.endsWith('.stl') || model.filePath.endsWith('.STL')) {
            jsonFilePath = model.filePath.replace(/\.stl$/i, '-stl-munchie.json').replace(/\.STL$/i, '-stl-munchie.json');
          } else if (model.filePath.endsWith('-munchie.json') || model.filePath.endsWith('-stl-munchie.json')) {
            // Already a JSON path, use as-is
            jsonFilePath = model.filePath;
          } else {
            // Assume it's a base name and add the JSON extension
            jsonFilePath = `${model.filePath}-munchie.json`;
          }
        } else if (model.modelUrl) {
          // Construct the path based on the modelUrl to match the actual JSON file location
          let relativePath = model.modelUrl.replace('/models/', '');
          // Replace .3mf/.stl extension with appropriate -munchie.json
          if (relativePath.endsWith('.3mf')) {
            relativePath = relativePath.replace('.3mf', '-munchie.json');
          } else if (relativePath.endsWith('.stl')) {
            relativePath = relativePath.replace('.stl', '-stl-munchie.json');
          } else if (relativePath.endsWith('-munchie.json') || relativePath.endsWith('-stl-munchie.json')) {
            // Already a JSON path, use as-is
            relativePath = relativePath;
          } else {
            // Assume it's a base name and add the JSON extension
            relativePath = `${relativePath}-munchie.json`;
          }
          jsonFilePath = relativePath;
        } else {
          // Fallback to using the model name
          jsonFilePath = `${model.name}-munchie.json`;
        }

        // Debug: show the original computed jsonFilePath
        console.debug(`[BulkEdit][DEBUG] Original computed jsonFilePath for ${model.name}:`, jsonFilePath);

        // Sanitize jsonFilePath: some malformed model paths include extra suffixes
        // like `-munchie.json_1.stl` (created by other tools or previous bugs). If
        // present, strip the trailing `_...` and any appended `.stl`/`.3mf` so we
        // write to the canonical `-munchie.json` or `-stl-munchie.json` file.
        const sanitizeJsonFilePath = (p: string) => {
          if (!p) return p;
          // Normalize backslashes for detection
          const normalized = p;
          const stlPattern = '-stl-munchie.json_';
          const threeMfPattern = '-munchie.json_';
          let idx = normalized.indexOf(stlPattern);
          if (idx !== -1) {
            return normalized.substring(0, idx + stlPattern.length - 1); // keep '-stl-munchie.json'
          }
          idx = normalized.indexOf(threeMfPattern);
          if (idx !== -1) {
            return normalized.substring(0, idx + threeMfPattern.length - 1); // keep '-munchie.json'
          }
          return p;
        };

  const sanitized = sanitizeJsonFilePath(jsonFilePath);
  jsonFilePath = sanitized;

        console.debug(`[BulkEdit][DEBUG] Sanitized jsonFilePath for ${model.name}:`, jsonFilePath);

        // Create updated model with changes applied
        const updatedModel = { ...model, filePath: jsonFilePath };
        
        // Related files handling: when selected, set related_files on each model
        if (fieldSelection.relatedFiles) {
          // If the user requested clearing all related files, do that regardless of included list
          if (editState.relatedClearAll) {
            (updatedModel as any).related_files = [];
          } else if (editState.relatedIncluded && editState.relatedIncluded.length > 0) {
          // Build list of related file URLs from included ids (excluding self).
          // Note: editState.relatedIncluded contains stable keys (modelUrl/filePath/id::name)
          const includedIds = editState.relatedIncluded;
          const relatedUrls: string[] = includedIds
            .filter((key) => key !== uniqueKeyForModel(model))
            .map((key) => {
              // Resolve the model by matching its unique key
              const m = models.find((x) => uniqueKeyForModel(x) === key);
              let url = m?.modelUrl || '';
              // Normalize: strip leading configured modelDirectory (default 'models/')
              // so related_files are stored relative to the models directory.
              const configured = (modelDirectory || './models').replace(/\\/g, '/');
              // Accept '/models/', 'models/', './models/', or absolute paths. Normalize for matching.
              const variants = [configured, configured.replace(/^\.\//, ''), '/' + configured.replace(/^\.\//, '')].map(v => v.replace(/\\/g, '/'));
              for (const v of variants) {
                if (v && url.startsWith(v)) {
                  url = url.substring(v.length);
                  break;
                }
              }
              return url;
            })
            .filter(Boolean);

          if (relatedUrls.length > 0) {
            (updatedModel as any).related_files = relatedUrls;
          } else {
            // If no related urls (maybe only self selected), clear related_files
            (updatedModel as any).related_files = [];
          }

            // If hide others option selected and a primary is chosen, then mark non-primary included models as hidden
            if (editState.relatedHideOthers && editState.relatedPrimary) {
              // For the model we're saving: if it's included but not the primary, hide it
              const modelKey = uniqueKeyForModel(model);
              if (includedIds.includes(modelKey) && editState.relatedPrimary !== modelKey) {
                (updatedModel as any).hidden = true;
              }
              // If this model is the primary, ensure it's visible
              if (editState.relatedPrimary === modelKey) {
                (updatedModel as any).hidden = false;
              }
            }
          }
        }
        // Apply bulk tag changes if selected
        if (fieldSelection.tags && editState.tags) {
          let newTags = [...(model.tags || [])];
          console.debug(`[BulkEdit][DEBUG] Existing tags for ${model.name}:`, newTags);
          
          // Remove tags
          if (editState.tags?.remove) {
            const toRemove = editState.tags.remove || [];
            console.debug(`[BulkEdit][DEBUG] Removing tags for ${model.name}:`, toRemove);
            newTags = newTags.filter(tag => !toRemove.includes(tag));
            console.debug(`[BulkEdit][DEBUG] Tags after removal for ${model.name}:`, newTags);
          }
          
          // Add new tags
          if (editState.tags?.add) {
            const toAdd = editState.tags.add || [];
            console.debug(`[BulkEdit][DEBUG] Adding tags for ${model.name}:`, toAdd);
            toAdd.forEach(tag => {
              if (!newTags.includes(tag)) {
                newTags.push(tag);
              }
            });
            console.debug(`[BulkEdit][DEBUG] Tags after addition for ${model.name}:`, newTags);
          }
          
          updatedModel.tags = newTags;
        }

        // Apply other field updates
        Object.keys(updates).forEach(key => {
          if (key !== 'bulkTagChanges') {
            (updatedModel as any)[key] = (updates as any)[key];
          }
        });

        // Debug: show what will be saved
        console.debug(`[BulkEdit][DEBUG] Saving model ${model.name} -> file: ${updatedModel.filePath}, tagsCount:`, updatedModel.tags?.length || 0);
        // Save to file
        await saveModelToFile(updatedModel, model);
        // Track the saved model so parent can merge without a full refresh
        savedModels.push(updatedModel as Model);
      }

      // If parent provided onBulkSaved, give it the exact updated models so it
      // can merge them into state without a full re-fetch. Otherwise fall back
      // to calling onRefresh() to reload metadata from disk.
      if (onBulkSaved) {
        try {
          onBulkSaved(savedModels);
        } catch (err) {
          console.error('onBulkSaved handler threw an error:', err);
        }
      } else if (onRefresh) {
        try {
          await onRefresh();
        } catch (err) {
          console.error('Failed to refresh models after bulk save:', err);
        }
      }

      // If regeneration was part of the operation, refresh models
      if (fieldSelection.regenerateMunchie && onRefresh) {
        await onRefresh();
      }

      // Clear selections if regeneration was involved
      if (fieldSelection.regenerateMunchie && onClearSelections) {
        onClearSelections();
      }

      // Close the drawer after successful save
      onClose();
    } catch (error) {
      console.error('Failed to save bulk changes:', error);
      // You might want to show a toast notification here
    } finally {
      setIsSaving(false);
    }
  };



  const hasChanges = Object.values(fieldSelection).some(
    (selected) => selected,
  );

  if (models.length === 0) return null;

  const handleSheetOpenChange = (newOpen: boolean) => {
    // Prevent closing the sheet while image generation is in progress
    if (!newOpen && isGeneratingImages) {
      // remember that the user requested a close so we can close afterwards
      setCloseRequestedWhileGenerating(true);
      return;
    }
    if (!newOpen) onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleSheetOpenChange}>
    <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader className="space-y-4 pb-6 border-b border-border">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1 min-w-0">
              <SheetTitle className="text-2xl font-semibold text-card-foreground flex items-center gap-2">
                <Users className="h-6 w-6" />
                Bulk Edit Models
              </SheetTitle>
              <SheetDescription className="text-muted-foreground">
                Editing {models.length} selected models. Only
                check the fields you want to update.
              </SheetDescription>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={!hasChanges || isSaving}
                    size="sm"
                    className="gap-2"
                  >
                    {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6 space-y-8">
          {/* Selected Models Preview */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-card-foreground">
              Selected Models
            </h3>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
              {models.slice(0, 10).map((model) => (
                <Badge
                  key={model.id}
                  variant="secondary"
                  className="text-xs"
                >
                  {model.name}
                </Badge>
              ))}
              {models.length > 10 && (
                <Badge variant="secondary" className="text-xs">
                  +{models.length - 10} more
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Generate Images button (moved above Category) */}
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex items-center gap-2">
                <Button
                  onClick={async () => {
                    const saved = await handleGenerateImages();
                    // After bulk image generation, refresh model cards using the authoritative saved models
                    if (onBulkSaved) {
                      await onBulkSaved(saved);
                    } else if (onRefresh) {
                      await onRefresh();
                    }
                  }}
                  disabled={isGeneratingImages}
                  size="sm"
                  className="gap-2"
                >
                  {isGeneratingImages ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  {isGeneratingImages ? `Generating ${generateProgress.current}/${generateProgress.total}` : 'Generate Images'}
                </Button>
              </div>
            </div>
            <p className="text-sm text-foreground">
              Only models without existing images will be processed; models that already have images are skipped. This can take some time for large selections and will block other edits — please wait until it completes.
            </p>
            {(isGeneratingImages || closeRequestedWhileGenerating) && (
              <Alert variant="destructive" className="border-red-500 text-red-700 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Image generation in progress</AlertTitle>
                <AlertDescription>Images are being generated; the drawer cannot be closed until the operation finishes.</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Category Field */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="category-field"
                checked={fieldSelection.category}
                onCheckedChange={() =>
                  handleFieldToggle("category")
                }
              />
              <Label
                htmlFor="category-field"
                className="font-medium"
              >
                <Layers className="h-4 w-4 text-foreground" />
                Category
              </Label>
            </div>

            {fieldSelection.category && (
              <div className="ml-6 space-y-2">
                <Select
                  value={editState.category || ""}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select new category" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Render available categories passed in via props. Use category.id as the
                        value but show the human-friendly label. Include an empty item for
                        clearing the selection. */}
                    {Array.isArray(categories) && categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {commonValues.category && (
                  <p className="text-xs text-muted-foreground">
                    Current: {commonValues.category}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* License Field */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="license-field"
                checked={fieldSelection.license}
                onCheckedChange={() =>
                  handleFieldToggle("license")
                }
              />
              <Label
                htmlFor="license-field"
                className="font-medium flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                License
              </Label>
            </div>

            {fieldSelection.license && (
              <div className="ml-6 space-y-2">
                <Select
                  value={editState.license || ""}
                  onValueChange={handleLicenseChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select new license" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLicenses.map((license) => (
                      <SelectItem key={license} value={license}>
                        {license}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {commonValues.license && (
                  <p className="text-xs text-muted-foreground">
                    Current: {commonValues.license}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Designer Field */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="designer-field"
                checked={fieldSelection.designer}
                onCheckedChange={() =>
                  handleFieldToggle("designer")
                }
              />
              <Label
                htmlFor="designer-field"
                className="font-medium flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Designer
              </Label>
            </div>

            {fieldSelection.designer && (
              <div className="ml-6 space-y-2">
                <Input
                  placeholder="Designer name"
                  value={editState.designer || ""}
                  onChange={(e) => handleDesignerChange(e.target.value)}
                />
                {commonValues.designer && (
                  <p className="text-xs text-muted-foreground">
                    Current: {commonValues.designer}
                  </p>
                )}
              </div>
            )}
          </div>


          {/* Print Status Field */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="print-status-field"
                checked={fieldSelection.isPrinted}
                onCheckedChange={() =>
                  handleFieldToggle("isPrinted")
                }
              />
              <Label
                htmlFor="print-status-field"
                className="font-medium"
              >
                <CircleCheckBig className="h-4 w-4" />
                Print Status
              </Label>
            </div>

            {fieldSelection.isPrinted && (
              <div className="ml-6 space-y-2">
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={editState.isPrinted || false}
                    onCheckedChange={handlePrintStatusChange}
                    id="bulk-printed"
                  />
                  <Label
                    htmlFor="bulk-printed"
                    className="flex items-center gap-2"
                  >
                    {editState.isPrinted ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    Mark as{" "}
                    {editState.isPrinted
                      ? "Printed"
                      : "Not Printed"}
                  </Label>
                </div>
                {commonValues.isPrinted !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    Currently:{" "}
                    {commonValues.isPrinted
                      ? "Printed"
                      : "Not Printed"}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Hidden Status Field */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="hidden-status-field"
                checked={fieldSelection.hidden}
                onCheckedChange={() =>
                  handleFieldToggle("hidden")
                }
              />
              <Label
                htmlFor="hidden-status-field"
                className="font-medium"
              >
                <Eye className="h-4 w-4" />
                Hidden Status
              </Label>
            </div>

            {fieldSelection.hidden && (
              <div className="ml-6 space-y-2">
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={editState.hidden || false}
                    onCheckedChange={handleHiddenChange}
                    id="bulk-hidden"
                  />
                  <Label
                    htmlFor="bulk-hidden"
                    className="flex items-center gap-2"
                  >
                    {editState.hidden ? (
                      <EyeOff className="h-4 w-4 text-orange-600" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                    {editState.hidden
                      ? "Hide from view"
                      : "Show in view"}
                  </Label>
                </div>
                {commonValues.hidden !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    Currently:{" "}
                    {commonValues.hidden
                      ? "Hidden"
                      : "Visible"}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Tags Field */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="tags-field"
                checked={fieldSelection.tags}
                onCheckedChange={() =>
                  handleFieldToggle("tags")
                }
              />
              <Label
                htmlFor="tags-field"
                className="font-medium flex items-center gap-2"
              >
                <Tag className="h-4 w-4" />
                Tags
              </Label>
            </div>

            {fieldSelection.tags && (
              <div className="ml-6 space-y-4">
                {/* Add New Tags */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Add Tags
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a tag..."
                      value={newTag}
                      onChange={(e) =>
                        setNewTag(e.target.value)
                      }
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={handleAddTag}
                      disabled={!newTag.trim()}
                      size="sm"
                    >
                      Add
                    </Button>
                  </div>

                  {/* Tags to Add */}
                  {editState.tags?.add &&
                    editState.tags.add.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Tags to add:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {editState.tags.add.map((tag) => (
                            <Badge
                              key={tag}
                              variant="default"
                              className="text-sm gap-1 cursor-pointer hover:bg-primary/80"
                              onClick={() =>
                                handleRemoveTagFromAdd(tag)
                              }
                            >
                              {tag}
                              <X className="h-3 w-3" />
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                </div>

                {/* Remove Existing Tags */}
                {allTags.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Remove Existing Tags
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Click on tags to toggle removal across all
                      selected models
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {allTags.map((tag) => {
                        const isRemoving =
                          editState.tags?.remove?.includes(tag);
                        return (
                          <Badge
                            key={tag}
                            variant={
                              isRemoving
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-sm cursor-pointer transition-colors"
                            onClick={() =>
                              handleToggleTagRemoval(tag)
                            }
                          >
                            {tag}
                            {isRemoving && (
                              <X className="h-3 w-3 ml-1" />
                            )}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes Field */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="notes-field"
                checked={fieldSelection.notes}
                onCheckedChange={() =>
                  handleFieldToggle("notes")
                }
              />
              <Label
                htmlFor="notes-field"
                className="font-medium flex items-center gap-2"
              >
                <StickyNote className="h-4 w-4" />
                Notes
              </Label>
            </div>

            {fieldSelection.notes && (
              <div className="ml-6 space-y-2">
                <Textarea
                  placeholder="Add notes for all selected models..."
                  value={editState.notes || ""}
                  onChange={(e) =>
                    handleNotesChange(e.target.value)
                  }
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  These notes will replace existing notes for
                  all selected models
                </p>
              </div>
            )}
          </div>

          {/* Related Files Field */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="related-files-field"
                checked={fieldSelection.relatedFiles}
                onCheckedChange={() => handleFieldToggle("relatedFiles")}
              />
              <Label htmlFor="related-files-field" className="font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Related Files
              </Label>
            </div>

            {fieldSelection.relatedFiles && (
              <div className="ml-6 space-y-3">
                <p className="text-sm">Select which of the selected models should be included as related files for each model, choose the primary, and optionally hide the others.</p>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Included Models</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {models.map((m) => {
                      const key = uniqueKeyForModel(m);
                      const included = (editState.relatedIncluded || relatedIncludedIds || []).includes(key);
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <Checkbox
                            checked={included}
                            onCheckedChange={() => {
                              // toggle include using stable unique keys
                              const current = new Set(editState.relatedIncluded || relatedIncludedIds || models.map(x => uniqueKeyForModel(x)));
                              if (current.has(key)) current.delete(key);
                              else current.add(key);
                              const arr = Array.from(current);
                              setEditState(prev => ({ ...prev, relatedIncluded: arr }));
                              setRelatedIncludedIds(arr);
                            }}
                          />
                          <span className="text-sm">{m.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setEditState(prev => ({ ...prev, relatedClearAll: true }))}
                  >
                    Remove related files from selected models
                  </Button>
                  {editState.relatedClearAll && (
                    <p className="text-sm text-destructive mt-2">All selected models will have their related files cleared when you save.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Primary File</Label>
                  <p className="text-xs text-muted-foreground">Choose which included model should be considered the primary.</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(editState.relatedIncluded || relatedIncludedIds || models.map(m=>uniqueKeyForModel(m))).map((id) => {
                      const m = models.find(x => uniqueKeyForModel(x) === id);
                      if (!m) return null;
                      const isPrimary = editState.relatedPrimary === id;
                      return (
                        <Button
                          key={id}
                          size="sm"
                          variant={isPrimary ? 'secondary' : 'outline'}
                          onClick={() => setEditState(prev => ({ ...prev, relatedPrimary: id }))}
                        >
                          {m.name}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Switch
                    checked={editState.relatedHideOthers || false}
                    onCheckedChange={(v) => setEditState(prev => ({ ...prev, relatedHideOthers: v }))}
                    id="related-hide-others"
                  />
                  <Label htmlFor="related-hide-others" className="flex items-center gap-2">
                    Hide all other models (only primary remains visible)
                  </Label>
                </div>
              </div>
            )}
          </div>

          {/* Source Field */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="source-field"
                checked={fieldSelection.source}
                onCheckedChange={() =>
                  handleFieldToggle("source")
                }
              />
              <Label
                htmlFor="source-field"
                className="font-medium flex items-center gap-2"
              >
                <Globe className="h-4 w-4" />
                Source URL
              </Label>
            </div>

            {fieldSelection.source && (
              <div className="ml-6 space-y-2">
                <Input
                  type="url"
                  placeholder="https://www.thingiverse.com/thing/123456"
                  value={editState.source || ""}
                  onChange={(e) =>
                    handleSourceChange(e.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  This URL will be set for all selected models
                </p>
              </div>
            )}
          </div>

          {/* Price Field */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="price-field"
                checked={fieldSelection.price}
                onCheckedChange={() =>
                  handleFieldToggle("price")
                }
              />
              <Label
                htmlFor="price-field"
                className="font-medium flex items-center gap-2"
              >
                <DollarSign className="h-4 w-4" />
                Selling Price
              </Label>
            </div>

            {fieldSelection.price && (
              <div className="ml-6 space-y-2">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={editState.price || ""}
                    onChange={(e) =>
                      handlePriceChange(e.target.value)
                    }
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  This price will be set for all selected models
                </p>
              </div>
            )}
          </div>

          {/* Bottom Action Bar */}
          {/* Print Time Field */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="print-time-field"
                checked={fieldSelection.printTime}
                onCheckedChange={() =>
                  handleFieldToggle("printTime")
                }
              />
              <Label
                htmlFor="print-time-field"
                className="font-medium flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Print Time
              </Label>
            </div>

            {fieldSelection.printTime && (
              <div className="ml-6 space-y-2">
                <Input
                  placeholder="e.g. 1h 30m"
                  value={editState.printTime || ""}
                  onChange={(e) => handlePrintTimeChange(e.target.value)}
                />
                {commonValues.printTime && (
                  <p className="text-xs text-muted-foreground">
                    Current: {commonValues.printTime}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Filament Field */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="filament-field"
                checked={fieldSelection.filamentUsed}
                onCheckedChange={() =>
                  handleFieldToggle("filamentUsed")
                }
              />
              <Label
                htmlFor="filament-field"
                className="font-medium flex items-center gap-2"
              >
                <Weight className="h-4 w-4" />
                Filament
              </Label>
            </div>

            {fieldSelection.filamentUsed && (
              <div className="ml-6 space-y-2">
                <Input
                  placeholder="e.g. 12g PLA"
                  value={editState.filamentUsed || ""}
                  onChange={(e) => handleFilamentChange(e.target.value)}
                />
                {commonValues.filamentUsed && (
                  <p className="text-xs text-muted-foreground">
                    Current: {commonValues.filamentUsed}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Regenerate Munchie Field */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="regenerate-munchie-field"
                checked={fieldSelection.regenerateMunchie}
                onCheckedChange={() =>
                  handleFieldToggle("regenerateMunchie")
                }
              />
              <Label
                htmlFor="regenerate-munchie-field"
                className="font-medium flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate Munchie Files
              </Label>
            </div>

            {fieldSelection.regenerateMunchie && (
              <div className="ml-6 space-y-2">
                <Alert className="border-yellow-500 text-yellow-700 dark:text-yellow-400">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>
                    This will re-parse the 3MF/STL files and regenerate metadata. Your custom notes, tags, category, and other user data will be preserved.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between pt-6 border-t border-border bg-muted/30 -mx-6 px-6 py-4 mt-8 rounded-lg">
            <p className="text-sm text-muted-foreground">
              {hasChanges
                ? "Ready to update"
                : "Select fields to update"}{" "}
              {models.length} models
            </p>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="gap-2"
            >
              {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
          </div>
        </ScrollArea>
        {/* Offscreen viewer removed; captures use RendererPool */}
      </SheetContent>
    </Sheet>
  );
}