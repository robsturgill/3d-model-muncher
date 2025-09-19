import { useState, useEffect, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Model } from "../types/model";
import { Category } from "../types/category";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { LICENSES, isKnownLicense } from '../constants/licenses';
import { Switch } from "./ui/switch";
import { Separator } from "./ui/separator";
import { AspectRatio } from "./ui/aspect-ratio";
import { ModelViewer3D } from "./ModelViewer3D";
import { ModelViewerErrorBoundary } from "./ErrorBoundary";
import { compressImageFile } from "../utils/imageUtils";
import { ImageWithFallback } from "./ImageWithFallback";
import { Clock, Weight, HardDrive, Layers, Droplet, Diameter, Edit3, Save, X, FileText, Plus, Tag, Box, Images, ChevronLeft, ChevronRight, Maximize2, StickyNote, ExternalLink, Globe, DollarSign, Store, CheckCircle, Ban, User } from "lucide-react";
import { Download } from "lucide-react";
import { triggerDownload } from "../utils/downloadUtils";

interface ModelDetailsDrawerProps {
  model: Model | null;
  isOpen: boolean;
  onClose: () => void;
  onModelUpdate: (model: Model) => void;
  defaultModelView?: '3d' | 'images';
  categories: Category[];
}

export function ModelDetailsDrawer({
  model,
  isOpen,
  onClose,
  onModelUpdate,
  defaultModelView = 'images',
  categories
}: ModelDetailsDrawerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedModel, setEditedModel] = useState<Model | null>(null);
  const [invalidRelated, setInvalidRelated] = useState<string[]>([]);
  const [serverRejectedRelated, setServerRejectedRelated] = useState<string[]>([]);
  const [relatedVerifyStatus, setRelatedVerifyStatus] = useState<Record<number, {loading: boolean; ok?: boolean; message?: string}>>({});
  const [newTag, setNewTag] = useState("");
  const [focusRelatedIndex, setFocusRelatedIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | 'images'>(defaultModelView);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [restoreOriginalDescription, setRestoreOriginalDescription] = useState(false);
  const originalTopLevelDescriptionRef = useRef<string | null>(null);
  const originalUserDefinedDescriptionRef = useRef<string | null>(null);

  // Suggested tags for each category - now dynamically based on current categories
  const getCategoryTags = (categoryLabel: string): string[] => {
    const defaultTags: Record<string, string[]> = {
      Miniatures: ["Miniature", "Fantasy", "Sci-Fi", "Dragon", "Warrior", "Monster", "D&D", "Tabletop"],
      Utility: ["Organizer", "Tool", "Stand", "Holder", "Clip", "Mount", "Storage", "Functional"],
      Decorative: ["Vase", "Ornament", "Art", "Display", "Sculpture", "Modern", "Elegant", "Beautiful"],
      Games: ["Chess", "Dice", "Board Game", "Puzzle", "Token", "Counter", "Gaming", "Entertainment"],
      Props: ["Cosplay", "Weapon", "Armor", "Helmet", "Shield", "Fantasy", "Replica", "Convention"]
    };
    return defaultTags[categoryLabel] || [];
  };

  // Reset view mode to default when drawer opens or when defaultModelView changes
  useEffect(() => {
    if (isOpen) {
      setViewMode(defaultModelView);
      setSelectedImageIndex(0);
    } else {
      // Reset editing state when drawer closes
      setIsEditing(false);
      setEditedModel(null);
      setNewTag("");
      setSelectedImageIndexes([]);
    }
  }, [isOpen, defaultModelView]);



  // In-window "fullscreen" (cover the browser viewport) for image previews
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  // Thumbnail strip container ref (used to programmatically scroll thumbnails into view)
  const thumbnailStripRef = useRef<HTMLDivElement | null>(null);
  const prevButtonRef = useRef<any>(null);
  const [isWindowFullscreen, setIsWindowFullscreen] = useState(false);
  // Ref mirror to synchronously track fullscreen state (avoids React state update race)
  const isWindowFullscreenRef = useRef<boolean>(false);

  const handleToggleFullscreen = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = !isWindowFullscreenRef.current;
    isWindowFullscreenRef.current = next;
    setIsWindowFullscreen(next);
  };

  // Exit fullscreen on Escape (keydown handler moved later, after allImages is defined)

  useEffect(() => {
    // Prevent background scrolling when in-window fullscreen is active
    const prev = document.body.style.overflow;
    if (isWindowFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = prev || '';
    }
    return () => {
      document.body.style.overflow = prev || '';
    };
  }, [isWindowFullscreen]);

    // Image selection state for edit mode (holds indexes into the gallery array)
    const [selectedImageIndexes, setSelectedImageIndexes] = useState<number[]>([]);
    // Number of parsed (original) images kept at top-level when entering edit mode.
    // This is used to map gallery indexes to either top-level images (thumbnail + images)
    // or user-added images stored in userDefined.images.
    const parsedImageCountRef = useRef<number>(0);
    // Drag state for reordering thumbnails in edit mode
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
      // File input ref for adding new images in edit mode
      const addImageInputRef = useRef<HTMLInputElement | null>(null);

      // Handle clicking the add-image tile
      const handleAddImageClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isEditing) return;
        addImageInputRef.current?.click();
      };

      // Read selected files (multiple allowed), compress/resample and add as base64 data URLs
      const [addImageProgress, setAddImageProgress] = useState<{ processed: number; total: number } | null>(null);
      const [addImageError, setAddImageError] = useState<string | null>(null);

      const handleAddImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        setAddImageError(null);
        // Capture the input element synchronously because React may recycle the
        // synthetic event after an await (causing e.currentTarget to become null).
        const inputEl = e.currentTarget as HTMLInputElement;
        const files = inputEl.files ? Array.from(inputEl.files) : [];
        if (files.length === 0 || !editedModel) {
          // clear the input so the same file can be reselected later
          try { inputEl.value = ''; } catch (err) { /* ignore */ }
          return;
        }

        // Validate: reject very large files up front (e.g., > 20MB)
        const oversize = files.find(f => f.size > 20 * 1024 * 1024);
        if (oversize) {
          setAddImageError(`File ${oversize.name} is too large (>20MB).`);
          try { inputEl.value = ''; } catch (err) { /* ignore */ }
          return;
        }

        setAddImageProgress({ processed: 0, total: files.length });

        try {
          const newDataUrls: string[] = [];

          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            // Compress/resample to reasonable size
            const dataUrl = await compressImageFile(file, { maxWidth: 1600, maxHeight: 1600, maxSizeBytes: 800000 });
            newDataUrls.push(dataUrl);
            setAddImageProgress({ processed: i + 1, total: files.length });
          }

          // Apply to editedModel: store user-added images under userDefined.images so
          // server-side parsed images (top-level thumbnail/images) remain separate.
          setEditedModel(prev => {
            if (!prev) return prev;
            // Ensure userDefined is an array with an object; use existing if present
            const ud = Array.isArray((prev as any).userDefined) && (prev as any).userDefined.length > 0 ? (prev as any).userDefined.slice() : [{}];
            // userDefined[0].images will hold user-added images (data URLs)
            const existingUserImages = (ud[0] as any).images && Array.isArray((ud[0] as any).images) ? (ud[0] as any).images.slice() : [];

            // If there was no top-level thumbnail, the UI historically used the first
            // added image as the thumbnail. We'll still honor that visually by
            // setting thumbnail if missing, but keep user images inside userDefined.
            let newThumbnail = prev.thumbnail || '';
            if (!prev.thumbnail && newDataUrls.length > 0) {
              newThumbnail = newDataUrls[0];
            }

            existingUserImages.push(...newDataUrls);
            ud[0] = { ...(ud[0] as any), images: existingUserImages };
            return { ...prev, thumbnail: newThumbnail, userDefined: ud } as Model;
          });

          // Compute the index of the last item added in the gallery deterministically.
          // Gallery is constructed as: [top-level thumbnail, ...top-level images, ...userDefined.images]
          const parsedCount = parsedImageCountRef.current;
          // Count existing user images before this operation (use editedModel snapshot)
          const userImagesBefore = Array.isArray(((editedModel as any)?.userDefined?.[0]?.images))
            ? (editedModel as any).userDefined[0].images.length
            : 0;
          const lastIndex = Math.max(0, parsedCount + userImagesBefore + newDataUrls.length - 1);
          setSelectedImageIndex(lastIndex);
        } catch (err: any) {
          console.error('Error adding images:', err);
          setAddImageError(String(err?.message || err));
        } finally {
          setAddImageProgress(null);
          try { inputEl.value = ''; } catch (err) { /* ignore */ }
        }
      };

    // Compute the full images array (thumbnail + additional images) from the currently-displayed model
    // Use editedModel when editing so the gallery reflects pending changes immediately.
    const allImages = (() => {
      const src = editedModel || model;
      if (!src) return [];
      const imgs = Array.isArray(src.images) ? src.images : [];
      // Append user-added images stored in userDefined[0].images (if present)
      const userImgs = Array.isArray((src as any).userDefined && (src as any).userDefined[0] && (src as any).userDefined[0].images)
        ? (src as any).userDefined[0].images
        : [];
      return [src.thumbnail, ...imgs, ...userImgs];
    })();

  // Key handling for in-window fullscreen navigation (Escape, ArrowLeft, ArrowRight)
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (!isWindowFullscreen) return;

      if (ev.key === 'Escape') {
        // Close fullscreen but do not allow the Escape to bubble to the Sheet drawer
        ev.preventDefault();
        ev.stopPropagation();
        try { ev.stopImmediatePropagation(); } catch (e) { /* ignore */ }
        // update ref synchronously to avoid race with onOpenChange
        isWindowFullscreenRef.current = false;
        setIsWindowFullscreen(false);
        return;
      }

      if (ev.key === 'ArrowLeft') {
        ev.preventDefault();
        setSelectedImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
        return;
      }

      if (ev.key === 'ArrowRight') {
        ev.preventDefault();
        setSelectedImageIndex((prev) => (prev + 1) % allImages.length);
        return;
      }
    };

    // Use capture phase so we intercept Escape before other handlers (like the Sheet's) that may close the drawer
    document.addEventListener('keydown', onKey, true);
    // Also intercept keyup in case other libraries (Radix) listen on keyup for Escape
    const onKeyUp = (ev: KeyboardEvent) => {
      if (!isWindowFullscreen) return;
      if (ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopPropagation();
        try { ev.stopImmediatePropagation(); } catch (e) { /* ignore */ }
        // ensure ref is in sync
        isWindowFullscreenRef.current = false;
      }
    };
    document.addEventListener('keyup', onKeyUp, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('keyup', onKeyUp, true);
    };
  }, [isWindowFullscreen, allImages.length]);

  // Helper: is an image (by gallery index) selected for deletion
  const isImageSelected = (index: number) => selectedImageIndexes.includes(index);

  // Toggle selection (only in edit mode and not in fullscreen)
  const toggleImageSelection = (index: number) => {
    if (!isEditing || isWindowFullscreen) return;
    setSelectedImageIndexes(prev => {
      const set = new Set(prev);
      if (set.has(index)) set.delete(index);
      else set.add(index);
      return Array.from(set).sort((a, b) => a - b);
    });
  };

  // Drag handlers: only enable when editing and not fullscreen
  const handleDragStart = (e: React.DragEvent, sourceIndex: number) => {
    if (!isEditing || isWindowFullscreen) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', String(sourceIndex));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    if (!isEditing || isWindowFullscreen) return;
    e.preventDefault(); // allow drop
    setDragOverIndex(targetIndex);
  };

  const handleDragLeave = (_e: React.DragEvent) => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    if (!isEditing || isWindowFullscreen) return;
    e.preventDefault();
    const src = e.dataTransfer.getData('text/plain');
    if (!src) return setDragOverIndex(null);
    const sourceIndex = parseInt(src, 10);
    if (isNaN(sourceIndex)) return setDragOverIndex(null);
    if (!editedModel) return setDragOverIndex(null);

  // Build combined array (parsed top-level images first, then user images)
  const parsedImgs = Array.isArray(editedModel.images) ? editedModel.images.slice() : [];
  const userImgs = Array.isArray((editedModel as any).userDefined?.[0]?.images) ? (editedModel as any).userDefined[0].images.slice() : [];
  const combined = [editedModel.thumbnail, ...parsedImgs, ...userImgs];
    // bounds
    if (sourceIndex < 0 || sourceIndex >= combined.length || targetIndex < 0 || targetIndex >= combined.length) {
      setDragOverIndex(null);
      return;
    }
    const item = combined.splice(sourceIndex, 1)[0];
    combined.splice(targetIndex, 0, item);

    // Apply new thumbnail and images to editedModel (do not persist yet).
    // Need to split combined back into parsed top-level images and userDefined.images.
    const newThumbnail = combined[0] || '';
    const rest = combined.slice(1);
    // Parsed images occupy the first parsedImageCountRef.current entries of rest
    const parsedCount = parsedImageCountRef.current - (editedModel.thumbnail ? 1 : 0);
    // parsedCount may be negative/NaN so clamp
    const parsedCountSafe = Math.max(0, Number.isFinite(parsedCount) ? parsedCount : 0);
    const newParsedImages = rest.slice(0, parsedCountSafe);
    const newUserImages = rest.slice(parsedCountSafe);
    setEditedModel(prev => {
      if (!prev) return prev;
      const ud = Array.isArray((prev as any).userDefined) && (prev as any).userDefined.length > 0 ? (prev as any).userDefined.slice() : [{}];
      ud[0] = { ...(ud[0] as any), images: newUserImages };
      return { ...prev, thumbnail: newThumbnail, images: newParsedImages, userDefined: ud } as Model;
    });
    // update preview index to the dropped location
    setSelectedImageIndex(targetIndex);
    // clear selection indexes because indexes changed
    setSelectedImageIndexes([]);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => setDragOverIndex(null);

  // When entering fullscreen, move keyboard focus to the previous-image button
  useEffect(() => {
    if (isWindowFullscreen) {
      // wait for the DOM to render the button
      const t = window.setTimeout(() => {
        try {
          prevButtonRef?.current?.focus?.();
        } catch (e) {
          // ignore
        }
      }, 0);
      return () => window.clearTimeout(t);
    }
    return;
  }, [isWindowFullscreen]);

  // Scroll the thumbnail strip so the selected thumbnail is visible.
  useEffect(() => {
    if (isWindowFullscreen) return; // thumbnails are hidden in fullscreen
    const container = thumbnailStripRef.current;
    if (!container) return;
    const selector = `[data-thumb-index=\"${selectedImageIndex}\"]`;
    const active = container.querySelector<HTMLElement>(selector);
    if (!active) return;

    // Use smooth scrolling when possible; center the thumbnail in view
    const containerRect = container.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const offset = (activeRect.left + activeRect.right) / 2 - (containerRect.left + containerRect.right) / 2;
    // Scroll by offset, but keep within bounds
    const desired = container.scrollLeft + offset;
    const final = Math.max(0, Math.min(desired, container.scrollWidth - container.clientWidth));
    try {
      container.scrollTo({ left: final, behavior: 'smooth' });
    } catch (e) {
      container.scrollLeft = final;
    }
  }, [selectedImageIndex, isWindowFullscreen]);

  const currentModel = editedModel || model;

  const startEditing = () => {
    // Ensure filePath is present for saving - convert to JSON file path
    let jsonFilePath;
    const srcModel = model!;
    if (srcModel.filePath) {
      // Convert from .3mf/.stl path to -munchie.json path
      if (srcModel.filePath.endsWith('.3mf')) {
        jsonFilePath = srcModel.filePath.replace('.3mf', '-munchie.json');
      } else if (srcModel.filePath.endsWith('.stl') || srcModel.filePath.endsWith('.STL')) {
        // Handle both lowercase and uppercase STL extensions
        jsonFilePath = srcModel.filePath.replace(/\.stl$/i, '-stl-munchie.json');
      } else if (srcModel.filePath.endsWith('-munchie.json') || srcModel.filePath.endsWith('-stl-munchie.json')) {
        // Already a JSON path, use as-is
        jsonFilePath = srcModel.filePath;
      } else {
        // Assume it's a base name and add the JSON extension
        jsonFilePath = `${srcModel.filePath}-munchie.json`;
      }
    } else if (srcModel.modelUrl) {
      // Construct the path based on the modelUrl to match the actual JSON file location
      let relativePath = srcModel.modelUrl.replace('/models/', '');
      // Replace .3mf/.stl extension with appropriate -munchie.json
      if (relativePath.endsWith('.3mf')) {
        relativePath = relativePath.replace('.3mf', '-munchie.json');
      } else if (relativePath.endsWith('.stl') || relativePath.endsWith('.STL')) {
        // Handle both lowercase and uppercase STL extensions
        relativePath = relativePath.replace(/\.stl$/i, '-stl-munchie.json');
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
      jsonFilePath = `${srcModel.name}-munchie.json`;
    }
    // Prefer a user-provided description stored in userDefined (structured)
    let initialDescription = (srcModel as any).description;
    try {
      const ud = (srcModel as any).userDefined;
      // Accept a userDefined.description even if it's an empty string; that
      // represents an explicit user value and should take precedence.
      if (Array.isArray(ud) && ud.length > 0 && ud[0] && typeof ud[0].description === 'string') {
        initialDescription = ud[0].description;
      }
    } catch (e) {
      // ignore and fallback to top-level description
    }
    // stash originals so the edit UI can toggle restoring the top-level description
    originalTopLevelDescriptionRef.current = typeof (srcModel as any).description === 'string' ? (srcModel as any).description : null;
    try {
      const ud = (srcModel as any).userDefined;
      // Store the userDefined description even if empty string; use null to
      // indicate absence of userDefined data.
      originalUserDefinedDescriptionRef.current = Array.isArray(ud) && ud.length > 0 && ud[0] && typeof ud[0].description === 'string' ? ud[0].description : null;
    } catch (e) {
      originalUserDefinedDescriptionRef.current = null;
    }
    setRestoreOriginalDescription(false);

    setEditedModel({ 
      ...srcModel, 
      filePath: jsonFilePath,
      tags: srcModel.tags || [], // Ensure tags is always an array
      description: initialDescription
    } as Model);
    // Capture how many images came from parsing (top-level thumbnail + images)
    const parsedImgs = Array.isArray(srcModel.images) ? srcModel.images : [];
    parsedImageCountRef.current = (srcModel.thumbnail ? 1 : 0) + parsedImgs.length;
    // Clear any previous image selections when entering edit mode
    setSelectedImageIndexes([]);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditedModel(null);
    setIsEditing(false);
    setNewTag("");
    setSelectedImageIndexes([]);
  };

  // Validate and normalize related_files. Returns { cleaned, invalid }.
  // Rules:
  const validateAndNormalizeRelatedFiles = (arr?: string[]) => {
    const cleaned: string[] = [];
    const invalid: string[] = [];
    if (!Array.isArray(arr)) return { cleaned, invalid };
    const seen = new Set<string>();
    for (const raw of arr) {
      if (typeof raw !== 'string') {
        invalid.push(String(raw));
        continue;
      }
      let s = raw.trim();
      if (s === '') {
        invalid.push(raw);
        continue;
      }
      // Remove surrounding single or double quotes for validation purposes
      const hadOuterQuotes = /^['"].*['"]$/.test(s);
      if (hadOuterQuotes) {
        s = s.replace(/^['"]|['"]$/g, '').trim();
        if (s === '') {
          invalid.push(raw);
          continue;
        }
      }
      if (s.includes('..')) {
        invalid.push(raw);
        continue;
      }
      s = s.replace(/\\/g, '/');
      // Reject UNC paths for security (\\server\share -> //server/share)
      if (s.startsWith('//')) {
        invalid.push(raw);
        continue;
      }
      // Reject absolute Windows drive paths (e.g., C:/something or C:\something)
      if (/^[a-zA-Z]:\//.test(s)) {
        invalid.push(raw);
        continue;
      }
      // Strip a single leading slash for relative paths
      if (s.startsWith('/')) s = s.substring(1);
      const key = s.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        cleaned.push(s);
      }
    }
    return { cleaned, invalid };
  };

  // Helper to send only changed fields to backend
  const saveModelToFile = async (edited: Model, original: Model) => {
    if (!edited.filePath) {
      console.error("No filePath specified for model");
      return;
    }
    // Use component-scope validateAndNormalizeRelatedFiles

    // Apply validation/normalization
    const editedForSave: any = { ...edited };
    const { cleaned, invalid } = validateAndNormalizeRelatedFiles(editedForSave.related_files as any);
    setInvalidRelated(invalid);
    if (invalid.length > 0) {
      // Block save client-side; caller can decide what to do
      return { success: false, error: 'validation_failed', invalid } as any;
    }
    editedForSave.related_files = cleaned;

    // Compute changed fields (excluding computed properties like filePath and modelUrl)
    const changes: any = { filePath: editedForSave.filePath, id: editedForSave.id };
    Object.keys(editedForSave).forEach(key => {
      if (key === 'filePath' || key === 'id' || key === 'modelUrl') return;
      const editedValue = JSON.stringify((editedForSave as any)[key]);
      const originalValue = JSON.stringify((original as any)[key]);
      if (editedValue !== originalValue) {
        changes[key] = (editedForSave as any)[key];
      }
    });

    // Special-case: if the user explicitly checked "Restore original description"
    // we want to remove any user-defined description. This is expressed by
    // writing userDefined = [] into the changes payload. Otherwise, if the
    // top-level description changed, persist it into userDefined as the
    // canonical location for user edits (even if it's an empty string).
    if (restoreOriginalDescription) {
      // Preserve any user-added images while removing only the user-defined description.
      // If the edited model has userDefined images, keep them. Otherwise, clear userDefined.
      const editedUserDefined = (editedForSave as any).userDefined;
      const existingImages = Array.isArray(editedUserDefined?.[0]?.images) ? editedUserDefined[0].images : undefined;
      if (existingImages !== undefined) {
        // Preserve images but remove description
        changes.userDefined = [{ ...(editedUserDefined?.[0] || {}), images: existingImages }];
      } else {
        // No user images present; clear userDefined entirely
        changes.userDefined = [];
      }
      // Ensure we don't accidentally send the top-level description
      delete changes.description;
    } else if (typeof changes.description !== 'undefined') {
      const desc = changes.description;
      // If a userDefined change was already detected (for example user-added images),
      // merge the description into that existing array entry rather than overwriting
      // the whole userDefined array and losing images.
      if (Array.isArray(changes.userDefined) && changes.userDefined.length > 0) {
        // Merge description into the first userDefined object
        changes.userDefined[0] = { ...(changes.userDefined[0] as any), description: desc };
      } else {
        // ensure userDefined is an array with a single entry containing description
        changes.userDefined = [{ description: desc }];
      }
      delete changes.description;
    }

    // Ensure that if the edited model contains user-defined images, they are included
    // in the outgoing changes payload even if other userDefined fields weren't detected
    // as changed by the generic diff (defensive). This guarantees user-added images
    // are sent to the server.
    const editedUD = (editedForSave as any).userDefined;
    if (Array.isArray(editedUD) && editedUD.length > 0 && Array.isArray(editedUD[0].images) && editedUD[0].images.length > 0) {
      // If changes.userDefined already exists, merge images into it, otherwise set it.
      if (Array.isArray(changes.userDefined) && changes.userDefined.length > 0) {
        changes.userDefined[0] = { ...(changes.userDefined[0] as any), images: editedUD[0].images };
      } else {
        changes.userDefined = [{ images: editedUD[0].images }];
      }
    }

  // Note: clearing is represented by writing userDefined = [] above when the
  // user checks the "Restore original description" checkbox. We no longer
  // rely on a local flag here — the post-save refresh below always fetches
  // the authoritative model.

    try {
      // Log a compact preview of the outgoing payload for debugging (avoid dumping full base64 blobs)
      try {
        const preview = { filePath: editedForSave.filePath, changes: { ...changes } } as any;
        if (preview.changes && Array.isArray(preview.changes.userDefined) && preview.changes.userDefined.length > 0) {
          const ud0 = preview.changes.userDefined[0];
          if (ud0 && Array.isArray(ud0.images)) {
            preview.changes.userDefined = [{ ...ud0, images: `[${ud0.images.length} images]` }];
          }
        }
        console.debug('POST /api/save-model payload preview:', preview);
      } catch (e) {
        // Don't let logging break the save flow
        console.warn('Failed to produce save-model preview log', e);
      }

      const response = await fetch('/api/save-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: editedForSave.filePath, changes })
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to save model');
      }
      // Show any server-side rejections (e.g., UNC paths removed)
      if (result && Array.isArray(result.rejected_related_files) && result.rejected_related_files.length > 0) {
        setServerRejectedRelated(result.rejected_related_files);
      } else {
        setServerRejectedRelated([]);
      }
      // Always refresh the authoritative model from the server after a
      // successful save so the UI can show any server-side normalizations.
      let refreshedModel: Model | undefined = undefined;
      try {
        const allResp = await fetch('/api/models');
        if (allResp.ok) {
          const all = await allResp.json();
          // Prefer matching by id, fallback to matching by filePath if provided
          const candidate = all.find((m: any) => (editedForSave.id && m.id === editedForSave.id) || (editedForSave.filePath && m.filePath === editedForSave.filePath));
          if (candidate) refreshedModel = candidate as Model;
        }
      } catch (e) {
        console.warn('Failed to refresh model after save:', e);
      }

      return { success: true, serverResponse: result, refreshedModel };
    } catch (err: unknown) {
      console.error("Failed to save model to file:", err);
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg } as any;
    }
  };

  const saveChanges = async () => {
    if (editedModel) {
      // If any images are selected, remove them from the edited model before saving.
      let finalModel = editedModel;
      if (selectedImageIndexes.length > 0) {
        const sel = new Set(selectedImageIndexes);
        // Build combined gallery [thumbnail, ...parsed images, ...user images]
        const parsedImgs = Array.isArray(editedModel.images) ? editedModel.images : [];
        const userImgs = Array.isArray((editedModel as any).userDefined?.[0]?.images) ? (editedModel as any).userDefined[0].images.slice() : [];
        const combined = [editedModel.thumbnail, ...parsedImgs, ...userImgs];
        const remaining = combined.filter((_, idx) => !sel.has(idx));
        const newThumbnail = remaining[0] || '';
        const rest = remaining.slice(1);
        // Split rest back into parsed and user based on original parsedImageCountRef
        const originalParsedCount = parsedImageCountRef.current;
        const parsedCountSafe = Math.max(0, originalParsedCount - (editedModel.thumbnail ? 1 : 0));
        const newParsedImages = rest.slice(0, parsedCountSafe);
        const newUserImages = rest.slice(parsedCountSafe);
        const ud = Array.isArray((editedModel as any).userDefined) && (editedModel as any).userDefined.length > 0 ? (editedModel as any).userDefined.slice() : [{}];
        ud[0] = { ...(ud[0] as any), images: newUserImages };
        finalModel = { ...editedModel, thumbnail: newThumbnail, images: newParsedImages, userDefined: ud } as Model;
      }
      // Validate related_files before applying to the app state and saving
      const { cleaned, invalid } = validateAndNormalizeRelatedFiles(finalModel.related_files as any);
      setInvalidRelated(invalid);
      if (invalid.length > 0) {
        // Block save and keep user in edit mode
        return;
      }

      // Replace with cleaned values before persisting
      finalModel = { ...finalModel, related_files: cleaned } as Model;

      // Persist to server first. After successful save, update the app state.
  const result = await saveModelToFile(finalModel, model!); // Only send changed fields
      if (result && result.success) {
        // If the save returned a refreshedModel (e.g., user cleared userDefined.description),
        // prefer that authoritative model from the server so the UI falls back to top-level description.
        const refreshed: Model | undefined = (result as any).refreshedModel;
        if (refreshed) {
          onModelUpdate(refreshed);
        } else {
          onModelUpdate(finalModel);
        }
        setIsEditing(false);
        setEditedModel(null);
        setNewTag("");
        setSelectedImageIndexes([]);
      } else {
        // Save failed (network/server error). Keep editedModel so user can retry.
        // Optionally display error (saveModelToFile already logs).
        return;
      }
    }
  };

  const handleAddTag = () => {
    if (!newTag.trim() || !editedModel) return;

    const trimmedTag = newTag.trim();
    const currentTags = editedModel.tags || [];
    const lowerNew = trimmedTag.toLowerCase();

    // Prevent duplicates case-insensitively
    const exists = currentTags.some(t => t.toLowerCase() === lowerNew);
    if (!exists) {
      setEditedModel({
        ...editedModel,
        tags: [...currentTags, trimmedTag]
      });
    }
    setNewTag("");
  };



  const handleTagKeyPress = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Remove a tag from the editedModel (case-insensitive)
  const handleRemoveTag = (tagToRemove: string) => {
    if (!editedModel) return;
    const filtered = (editedModel.tags || []).filter(t => t.toLowerCase() !== tagToRemove.toLowerCase());
    setEditedModel({ ...editedModel, tags: filtered });
  };

  // Live-validate related_files whenever the edited model's related_files changes
  useEffect(() => {
    if (!editedModel) {
      setInvalidRelated([]);
      return;
    }
    const { invalid } = validateAndNormalizeRelatedFiles(editedModel.related_files as any);
    setInvalidRelated(invalid);
  }, [editedModel?.related_files]);

  // Focus newly-added related_files input when created
  useEffect(() => {
    if (focusRelatedIndex === null) return;
    // Query the input with the data attribute and focus it
    const selector = `input[data-related-index=\"${focusRelatedIndex}\"]`;
    const el = document.querySelector<HTMLInputElement>(selector);
    if (el) {
      try { el.focus(); el.select(); } catch (e) { /* ignore */ }
    }
    // Clear the target so we don't refocus later
    setFocusRelatedIndex(null);
  }, [focusRelatedIndex]);

  const getSuggestedTags = () => {
    if (!editedModel || !editedModel.category) return [];
    
    const suggestedTags = getCategoryTags(editedModel.category);
    // Filter out tags that already exist on the editedModel (case-insensitive)
    const existing = new Set((editedModel.tags || []).map(t => t.toLowerCase()));
    return suggestedTags.filter((tag: string) => !existing.has(tag.toLowerCase()));
  };

  const handleSuggestedTagClick = (tag: string) => {
    if (!editedModel) return;
    // Prevent duplicates (case-insensitive)
    const currentTags = editedModel.tags || [];
    const lowerTag = tag.toLowerCase();
    if (currentTags.some(t => t.toLowerCase() === lowerTag)) return;

    setEditedModel({
      ...editedModel,
      tags: [...currentTags, tag]
    });
  };

  const handleNextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const handlePreviousImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };


  // Download handler for model file
  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Determine default extension based on modelUrl if available
    const defaultExtension = currentModel!.modelUrl?.endsWith('.stl') ? '.stl' : '.3mf';
    // Prefer filePath, fallback to modelUrl or name
      let fileName = currentModel!.filePath
        ? currentModel!.filePath.split(/[/\\]/).pop() || `${currentModel!.name}${defaultExtension}`
        : currentModel!.modelUrl?.replace('/models/', '') || `${currentModel!.name}${defaultExtension}`;
    let filePath = currentModel!.filePath
      ? `/models/${fileName}`
      : currentModel!.modelUrl || `/models/${fileName}`;
    // Use shared triggerDownload to normalize and trigger the download
    triggerDownload(filePath, e.nativeEvent);
  };

  // Intercept Sheet open/close changes so that if the user tries to close the
  // Sheet (e.g. via Escape or overlay click) while an image is in the
  // in-window fullscreen, we exit fullscreen first and keep the Sheet open.
  const handleSheetOpenChange = (open: boolean) => {
    // Use the ref to synchronously decide whether to allow the Sheet to close.
    if (!open && isWindowFullscreenRef.current) {
      // Close only the fullscreen state; don't call onClose so the sheet stays open
      isWindowFullscreenRef.current = false;
      setIsWindowFullscreen(false);
      return;
    }
    if (!open) {
      onClose();
    }
  };

  // Handler for Radix Dialog's Content-level escape event. This runs inside
  // Radix before it triggers the default close behavior allowing us to
  // prevent the Sheet from closing when an image fullscreen is active.
  const handleContentEscapeKeyDown = (ev: KeyboardEvent) => {
    if (isWindowFullscreenRef.current && ev.key === 'Escape') {
      ev.preventDefault();
      ev.stopPropagation();
      try { ev.stopImmediatePropagation(); } catch (e) { /* ignore */ }
      isWindowFullscreenRef.current = false;
      setIsWindowFullscreen(false);
    }
  };
  // Ensure we have a model to render. Keep this check after all hooks so hook order remains stable.
  if (!currentModel) return null;

  // Display path: prefer filePath (JSON path), fall back to modelUrl (trim leading /models/) or a default filename
  const displayModelPath = currentModel.filePath
    ? currentModel.filePath
    : currentModel.modelUrl
    ? currentModel.modelUrl.replace(/^\/models\//, '')
    : `${currentModel.name}.3mf`;
  // Defensive: ensure printSettings is always an object with string fields
  const safePrintSettings = {
    layerHeight: currentModel.printSettings?.layerHeight || '',
    infill: currentModel.printSettings?.infill || '',
    nozzle: currentModel.printSettings?.nozzle || ''
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleSheetOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl" onEscapeKeyDown={handleContentEscapeKeyDown}>
        {/* Sticky Header during editing */}
        <SheetHeader className={`space-y-4 pb-6 border-b border-border bg-background/95 backdrop-blur-sm ${isEditing ? 'sticky top-0 z-10 shadow-sm' : ''}`}> 
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1 min-w-0">
              <SheetTitle className="text-2xl font-semibold text-card-foreground pr-4">
                {currentModel.name}
              </SheetTitle>
              <SheetDescription className="text-muted-foreground">
                {currentModel.category} • {currentModel.isPrinted ? 'Printed' : 'Not Printed'}
                {currentModel.hidden && (
                  <>
                    {" • "}
                    <Badge variant="outline" className="text-xs bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300">
                      Hidden
                    </Badge>
                  </>
                )}
              </SheetDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isEditing ? (
                <>
                  <Button onClick={saveChanges} size="sm" className="gap-2" disabled={invalidRelated.length > 0} title={invalidRelated.length > 0 ? 'Cannot save: fix invalid related files' : undefined}>
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                  <Button onClick={cancelEditing} variant="outline" size="sm">
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button onClick={startEditing} variant="outline" size="sm" className="gap-2">
                  <Edit3 className="h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-8">
          {/* Model file path / URL (readonly, download) - moved above preview */}
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Label className="whitespace-nowrap text-muted-foreground">Path</Label>
              <div className="flex-1 flex items-center gap-2">
                <Input readOnly value={displayModelPath} className="text-sm truncate" />
                {/* Use the existing download handler here instead of a separate copy button */}
                <Button onClick={handleDownloadClick} size="sm" variant="default" className="gap-2" title="Download model file">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          </div>

          {/* Model Viewer with Toggle */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg text-card-foreground">Model Preview</h3>
              
              {/* View Mode Toggle */}
              <div className="flex items-center bg-muted/30 rounded-lg p-1 border">
                <Button
                  variant={viewMode === '3d' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('3d')}
                  className="gap-2 h-8 px-3"
                >
                  <Box className="h-4 w-4" />
                  3D Model
                </Button>
                <Button
                  variant={viewMode === 'images' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('images')}
                  className="gap-2 h-8 px-3"
                >
                  <Images className="h-4 w-4" />
                  Images ({allImages.length})
                </Button>
              </div>
            </div>

            <div className="relative bg-gradient-to-br from-muted/30 to-muted/60 rounded-xl border overflow-hidden">
              {viewMode === '3d' ? (
                <ModelViewerErrorBoundary>
                  <ModelViewer3D 
                    modelUrl={currentModel.modelUrl} 
                    modelName={currentModel.name}
                  />
                </ModelViewerErrorBoundary>
              ) : (
                <div
                  ref={imageContainerRef}
                  className={isWindowFullscreen ? 'fixed inset-0 z-50 flex items-center justify-center p-6' : 'relative'}
                >
                  {isWindowFullscreen && (
                    <div
                      className="absolute inset-0 bg-black/50"
                      onClick={() => setIsWindowFullscreen(false)}
                      aria-hidden
                    />
                  )}

                  {/* Main Image Display */}
                  {isWindowFullscreen ? (
                    <div className="w-full flex items-center justify-center">
                      <div className="relative z-10 w-full max-w-[90vw] max-h-[90vh] flex flex-col items-center justify-center">
                        {/* thumbnails are hidden in fullscreen mode */}

                        <div className="relative w-full flex items-center justify-center">
                          {/* dark background for transparent images */}
                          <div className="absolute inset-0 bg-gradient-dark rounded-lg" aria-hidden />
                          <ImageWithFallback src={allImages[selectedImageIndex]} alt={`${currentModel.name} - Image ${selectedImageIndex + 1}`} className="relative max-w-full max-h-full object-contain rounded-lg" />

                          {allImages.length > 1 && (
                            <>
                              <Button ref={prevButtonRef} variant="secondary" size="sm" onClick={handlePreviousImage} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 p-0 bg-background/80 hover:bg-background/90 border shadow-lg" aria-label="Previous image">
                                <ChevronLeft className="h-5 w-5" />
                              </Button>
                              <Button variant="secondary" size="sm" onClick={handleNextImage} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 p-0 bg-background/80 hover:bg-background/90 border shadow-lg" aria-label="Next image">
                                <ChevronRight className="h-5 w-5" />
                              </Button>
                            </>
                          )}

                          <div className="absolute bottom-3 right-3 bg-background/80 backdrop-blur-sm rounded-lg px-2 py-1 text-sm font-medium border shadow-lg">{selectedImageIndex + 1} / {allImages.length}</div>

                          <Button variant="secondary" size="sm" className="absolute top-3 right-3 w-8 h-8 p-0 bg-background/90 border shadow-lg" aria-label="Exit fullscreen" title="Exit fullscreen" onClick={handleToggleFullscreen}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <AspectRatio ratio={16 / 10} className={`bg-muted`}>
                        <ImageWithFallback src={allImages[selectedImageIndex]} alt={`${currentModel.name} - Image ${selectedImageIndex + 1}`} className={`w-full h-full object-cover rounded-lg`} />

                        {allImages.length > 1 && (
                          <>
                            <Button variant="secondary" size="sm" onClick={handlePreviousImage} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 p-0 bg-background/80 hover:bg-background/90 border shadow-lg" aria-label="Previous image">
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="secondary" size="sm" onClick={handleNextImage} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 p-0 bg-background/80 hover:bg-background/90 border shadow-lg" aria-label="Next image">
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </>
                        )}

                        <div className="absolute bottom-3 right-3 bg-background/80 backdrop-blur-sm rounded-lg px-2 py-1 text-sm font-medium border shadow-lg">{selectedImageIndex + 1} / {allImages.length}</div>

                        <Button variant="secondary" size="sm" className={`absolute top-3 right-3 w-8 h-8 p-0 bg-background/80 hover:bg-background/90 border shadow-lg`} aria-label={"View fullscreen"} title={"View fullscreen"} onClick={handleToggleFullscreen}>
                          <Maximize2 className="h-4 w-4" />
                        </Button>
                      </AspectRatio>

                      {/* Thumbnail Strip (normal view) */}
                      {(allImages.length > 1 || isEditing) && (
                        // set a fixed height so the Radix ScrollArea viewport can render a scrollbar
                        <ScrollArea className="mt-4 h-20" viewportRef={thumbnailStripRef} showHorizontalScrollbar={true} showVerticalScrollbar={false}>
                          <div className="flex gap-2 items-center h-20 py-1 pl-2 w-20">
                              {/* Hidden file input for adding images (used in edit mode). Allow multiple selection. */}
                              <input
                                key="add-image-input"
                                ref={addImageInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleAddImageFile}
                              />

                          {allImages.map((image, index) => (
                            <button
                              key={index}
                              data-thumb-index={index}
                              draggable={isEditing && !isWindowFullscreen}
                              onDragStart={(e) => handleDragStart(e, index)}
                              onDragOver={(e) => handleDragOver(e, index)}
                              onDrop={(e) => handleDrop(e, index)}
                              onDragLeave={handleDragLeave}
                              onDragEnd={handleDragEnd}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isEditing && !isWindowFullscreen) {
                                  // toggle selection and show preview
                                  toggleImageSelection(index);
                                  setSelectedImageIndex(index);
                                } else {
                                  setSelectedImageIndex(index);
                                }
                              }}
                              className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${isImageSelected(index) ? 'opacity-60 ring-2 ring-destructive scale-95' : index === selectedImageIndex ? 'border-primary shadow-lg scale-105' : 'border-border hover:border-primary/50 hover:scale-102'} ${dragOverIndex === index ? 'ring-2 ring-primary/60' : ''}`}
                            >
                              <ImageWithFallback src={image} alt={`${currentModel.name} thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                              {isImageSelected(index) && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-semibold">
                                  Remove
                                </div>
                              )}
                              {index === 0 && (
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                  <Badge variant="secondary" className="text-xs px-1 py-0">Main</Badge>
                                </div>
                              )}
                            </button>
                          ))}
                          {/* Scroll the thumbnail container to show the selected item */}
                          {/* The container ref is attached below in the wrapping div */}
                          {/* Add Image tile (only show in edit mode). Placed after existing thumbnails so it doesn't affect indexing for drag/drop */}
                          {isEditing && (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={handleAddImageClick}
                                className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary"
                              >
                                <Plus className="h-5 w-5" />
                                <span className="sr-only">Add image</span>
                              </button>
                              {/* Inline progress / error */}
                              {addImageProgress && (
                                <div className="absolute -bottom-5 left-0 w-full text-xs text-muted-foreground text-center">
                                  {addImageProgress.processed} / {addImageProgress.total}
                                </div>
                              )}
                              {addImageError && (
                                <div className="absolute -bottom-6 left-0 w-64 text-xs text-destructive">
                                  {addImageError}
                                </div>
                              )}
                            </div>
                          )}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Print Settings */}
          <div className="space-y-4 mb-4">
            <h3 className="font-semibold text-lg text-card-foreground">Print Settings</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Print Time:</span>
                <span className="font-medium text-foreground">{currentModel.printTime}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Weight className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Filament:</span>
                <span className="font-medium text-foreground">{currentModel.filamentUsed}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">File Size:</span>
                <span className="font-medium text-foreground">{currentModel.fileSize}</span>
              </div>
            </div>

            <Separator />
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-center justify-center w-10 h-10 bg-background rounded-lg border">
                  <Layers className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Layer Height</p>
                  <p className="font-semibold text-foreground">{safePrintSettings.layerHeight ? `${safePrintSettings.layerHeight} mm` : ''}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-center justify-center w-10 h-10 bg-background rounded-lg border">
                  <Droplet className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Infill</p>
                  <p className="font-semibold text-foreground">{safePrintSettings.infill}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-center justify-center w-10 h-10 bg-background rounded-lg border">
                  <Diameter className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nozzle</p>
                  <p className="font-semibold text-foreground">{safePrintSettings.nozzle ? `${safePrintSettings.nozzle} mm` : ''}</p>
                </div>
              </div>
            </div>

            {/* Pricing Section (shows only if price defined) */}
            {currentModel.price !== undefined && currentModel.price !== 0 && (
              <>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                    <div className="flex items-center justify-center w-10 h-10 bg-background rounded-lg border">
                      <Store className="h-5 w-5 text-muted-foreground" />
                    </div>                    
                    <div>
                      <p className="text-sm text-muted-foreground">Price</p>
                      <p className="text-xl font-semibold text-foreground">${currentModel.price}</p>
                    </div>
                  </div>
                </div>
              </>
            )}            
          </div>

          {/* Model Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-card-foreground">Details</h3>
            {isEditing ? (
              <div className="grid gap-6">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Model Name</Label>
                    <Input
                      id="edit-name"
                      value={editedModel?.name || ""}
                      onChange={(e) => setEditedModel(prev => prev ? { ...prev, name: e.target.value } : null)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-category">Category</Label>
                    <Select
                      value={editedModel?.category || ""}
                      onValueChange={(value: string) => setEditedModel(prev => prev ? { ...prev, category: value } : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.label}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-designer">Designer</Label>
                    <Input
                      id="edit-designer"
                      // Model type doesn't currently include `designer`/`Designer` optional property.
                      // Use a safe any-cast to read legacy metadata if present (e.g., Designer from 3mf metadata).
                        value={editedModel?.designer ?? ""}
                        onChange={(e) => setEditedModel(prev => prev ? ({ ...prev, designer: e.target.value } as any) as Model : null)}
                      placeholder="Designer name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editedModel?.description || ""}
                    onChange={(e) => setEditedModel(prev => prev ? { ...prev, description: e.target.value } : null)}
                    rows={3}
                  />
                    {/* If there is a stored userDefined description (including empty string), allow restoring the original top-level description */}
                    {originalUserDefinedDescriptionRef.current !== null && (
                      <div className="pt-2">
                        <div className="flex items-center space-x-3">
                          <Switch
                            checked={restoreOriginalDescription}
                            onCheckedChange={(next: boolean) => {
                              setRestoreOriginalDescription(next);
                              setEditedModel(prev => {
                                if (!prev) return prev;
                                if (next) {
                                  // Remove any userDefined description so save will clear it
                                  const copy = { ...prev } as any;
                                  copy.userDefined = [];
                                  copy.description = originalTopLevelDescriptionRef.current || '';
                                  return copy as Model;
                                } else {
                                  // Restore the previous userDefined description into the edit buffer
                                  const copy = { ...prev } as any;
                                  if (originalUserDefinedDescriptionRef.current !== null) {
                                    copy.userDefined = [{ description: originalUserDefinedDescriptionRef.current }];
                                    copy.description = originalUserDefinedDescriptionRef.current;
                                  }
                                  return copy as Model;
                                }
                              });
                            }}
                            id="restore-original-description"
                          />
                          <Label htmlFor="restore-original-description">Restore original description</Label>
                        </div>
                      </div>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-license">License</Label>
                    <Select
                      value={editedModel?.license || ""}
                      onValueChange={(value: string) => setEditedModel(prev => prev ? { ...prev, license: value } : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {/* If the current edited license isn't in the known set, show it as a disabled item
                            so the SelectTrigger displays the value instead of an empty placeholder. */}
                        {editedModel?.license && !isKnownLicense(editedModel.license) && (
                          <SelectItem value={editedModel.license} disabled>
                            {editedModel.license} (unknown)
                          </SelectItem>
                        )}

                        {LICENSES.map((lic) => (
                          <SelectItem key={lic} value={lic}>{lic}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-price">Selling Price</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="edit-price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={editedModel?.price ?? ""}
                        onChange={(e) =>
                          setEditedModel(prev =>
                            prev
                              ? { ...prev, price: e.target.value === "" ? 0 : parseFloat(e.target.value) }
                              : null
                          )
                        }
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Switch
                    checked={editedModel?.isPrinted || false}
                    onCheckedChange={(checked: boolean) => setEditedModel(prev => prev ? { ...prev, isPrinted: checked } : null)}
                    id="edit-printed"
                  />
                  <Label htmlFor="edit-printed">Mark as printed</Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Switch
                    checked={editedModel?.hidden || false}
                    onCheckedChange={(checked: boolean) => setEditedModel(prev => prev ? { ...prev, hidden: checked } : null)}
                    id="edit-hidden"
                  />
                  <Label htmlFor="edit-hidden">Hide model from view</Label>
                </div>

                {/* Print Time & Filament Editing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-print-time">Print Time</Label>
                    <Input
                      id="edit-print-time"
                      placeholder="e.g. 1h 30m"
                      value={editedModel?.printTime || ""}
                      onChange={(e) => setEditedModel(prev => prev ? { ...prev, printTime: e.target.value } : null)}
                    />
                    <p className="text-xs text-muted-foreground">Friendly print time string (keeps existing formatting).</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-filament">Filament</Label>
                    <Input
                      id="edit-filament"
                      placeholder="e.g. 12g PLA"
                      value={editedModel?.filamentUsed || ""}
                      onChange={(e) => setEditedModel(prev => prev ? { ...prev, filamentUsed: e.target.value } : null)}
                    />
                    <p className="text-xs text-muted-foreground">Amount/type of filament used.</p>
                  </div>
                </div>

                {/* Tags Editing Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Label>Tags</Label>
                  </div>
                  
                  {/* Add New Tag */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a tag..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={handleTagKeyPress}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={handleAddTag}
                      disabled={!newTag.trim()}
                      size="sm"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>

                  {/* Suggested Tags */}
                  {getSuggestedTags().length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Suggested tags for {currentModel.category}:</p>
                      <div className="flex flex-wrap gap-2">
                        {getSuggestedTags().map((tag: string) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-sm cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                            onClick={() => handleSuggestedTagClick(tag)}
                          >
                            + {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Current Tags (click to remove) */}
                  {editedModel && (editedModel.tags || []).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Current tags:</p>
                      <div className="flex flex-wrap gap-2">
                        {(editedModel.tags || []).map((tag, index) => (
                          <Badge
                            key={`${tag}-${index}`}
                            variant="secondary"
                            className="text-sm gap-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                            onClick={() => handleRemoveTag(tag)}
                          >
                            {tag}
                            <X className="h-3 w-3" />
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">Click on a tag to remove it</p>
                    </div>
                  )}
                </div>

                {/* Notes Editing Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="edit-notes">Notes</Label>
                  </div>
                  <Textarea
                    id="edit-notes"
                    placeholder="Add your personal notes about this model..."
                    value={editedModel?.notes || ""}
                    onChange={(e) => setEditedModel(prev => prev ? { ...prev, notes: e.target.value } : null)}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use notes to track print settings, modifications, or reminders.
                  </p>
                </div>

                {/* Related Files Editing Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Related files</Label>
                  </div>

                  <p className="text-xs text-muted-foreground">Provide a relative path to a file in the `models/` folder (or any public path). In view mode these become download links.</p>

                  <div className="space-y-2">
                    {(editedModel?.related_files || []).map((rf, idx) => (
                      <div key={`related-${idx}`} className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setEditedModel(prev => {
                          if (!prev) return prev;
                          const arr = Array.isArray(prev.related_files) ? prev.related_files.slice() : [];
                          arr.splice(idx, 1);
                          return { ...prev, related_files: arr } as Model;
                        })} aria-label={`Remove related file ${idx}`} title="Remove this related file">
                          <X className="h-4 w-4" />
                        </Button>                        
                        <Input
                          data-related-index={idx}
                          value={rf}
                          placeholder={"path/to/related_file.zip"}
                          onChange={(e) => setEditedModel(prev => {
                            if (!prev) return prev;
                            const arr = Array.isArray(prev.related_files) ? prev.related_files.slice() : [];
                            arr[idx] = e.target.value;
                            return { ...prev, related_files: arr } as Model;
                          })}
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-w-[64px] flex items-center gap-2"
                            onClick={async (e) => {
                              e.stopPropagation();
                              setRelatedVerifyStatus(prev => ({ ...prev, [idx]: { loading: true } }));
                              try {
                                const resp = await fetch('/api/verify-file', {
                                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: rf })
                                });
                                const j = await resp.json();
                                if (j && j.success) {
                                  setRelatedVerifyStatus(prev => ({ ...prev, [idx]: { loading: false, ok: !!j.exists, message: j.exists ? `Found (${j.size} bytes)` : 'Not found' } }));
                                } else {
                                  setRelatedVerifyStatus(prev => ({ ...prev, [idx]: { loading: false, ok: false, message: j && j.error ? String(j.error) : 'Error' } }));
                                }
                              } catch (err: any) {
                                setRelatedVerifyStatus(prev => ({ ...prev, [idx]: { loading: false, ok: false, message: String(err?.message || err) } }));
                              }
                            }}
                            title={relatedVerifyStatus[idx]?.loading
                              ? 'Checking...'
                              : relatedVerifyStatus[idx] && typeof relatedVerifyStatus[idx].ok !== 'undefined'
                                ? (relatedVerifyStatus[idx].ok ? 'Found' : 'Not found')
                                : 'Verify'}
                          >
                            {relatedVerifyStatus[idx]?.loading ? (
                              'Checking...'
                            ) : relatedVerifyStatus[idx] && typeof relatedVerifyStatus[idx].ok !== 'undefined' ? (
                              relatedVerifyStatus[idx].ok ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Ban className="h-4 w-4 text-destructive" />
                            ) : (
                              'Verify'
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center gap-2">
                      {/* When Add is clicked we push an empty editable input with a helpful placeholder and focus it */}
                      <Button size="sm" onClick={() => {
                        setEditedModel(prev => {
                          if (!prev) return prev;
                          const arr = Array.isArray(prev.related_files) ? prev.related_files.slice() : [];
                          const newIdx = arr.length;
                          arr.push("");
                          // set focus target for effect after render
                          setTimeout(() => setFocusRelatedIndex(newIdx), 0);
                          return { ...prev, related_files: arr } as Model;
                        });
                      }}>
                        Add
                      </Button>
                    </div>
                    {/* Validation feedback for related files */}
                    {(invalidRelated && invalidRelated.length > 0) && (
                      <div className="text-sm text-destructive mt-2">
                        <strong>Invalid related files (remove or correct to save):</strong>
                        <ul className="list-disc pl-5 mt-1">
                          {invalidRelated.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                    {(serverRejectedRelated && serverRejectedRelated.length > 0) && (
                      <div className="text-sm text-yellow-700 mt-2">
                        <strong>Server rejected these entries (they were removed):</strong>
                        <ul className="list-disc pl-5 mt-1">
                          {serverRejectedRelated.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Source Editing Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="edit-source">Source URL</Label>
                  </div>
                  <Input
                    id="edit-source"
                    type="url"
                    placeholder="https://www.thingiverse.com/thing/123456"
                    value={editedModel?.source || ""}
                    onChange={(e) => setEditedModel(prev => prev ? { ...prev, source: e.target.value } : null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Link to where you downloaded this model (Thingiverse, Printables, etc.)
                  </p>
                </div>

                {/* Bottom Action Buttons for Editing */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-border bg-muted/30 -mx-6 px-6 py-4 mt-8 rounded-lg">
                  <Button onClick={cancelEditing} variant="outline" className="gap-2">
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button onClick={saveChanges} className="gap-2" disabled={invalidRelated.length > 0} title={invalidRelated.length > 0 ? 'Cannot save: fix invalid related files' : undefined}>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-muted-foreground text-base leading-relaxed">
                  {(() => {
                    // Prefer userDefined[0].description when available (structured user data)
                    try {
                        const ud = (currentModel as any).userDefined;
                        // Prefer the userDefined description even if it's an empty string
                        // because that represents an explicit user-provided value.
                        if (Array.isArray(ud) && ud.length > 0 && ud[0] && typeof ud[0].description === 'string') {
                          return ud[0].description;
                        }
                      } catch (e) {
                        // ignore and fall back
                      }
                    return currentModel.description;
                  })()}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* License Information (hidden when not set) */}
                  {currentModel.license && (
                    <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">License:</span>
                      <Badge variant="outline" className="font-medium">
                        {currentModel.license}
                      </Badge>
                    </div>
                  )}

                  {/* Designer (if present) */}
                  {currentModel.designer && (
                    <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Designer:</span>
                      <span className="font-medium">{currentModel.designer}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          
          
          </div>


          {!isEditing && Array.isArray(currentModel.tags) && currentModel.tags.length > 0 && (
            <>
              <Separator />
              {/* Tags Display */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold text-lg text-card-foreground">Tags</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentModel.tags.map((tag, index) => (
                    <Badge key={`${tag}-${index}`} variant="secondary" className="text-sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}



          {currentModel.notes && (
            <>
              <Separator />
              {/* Notes Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <StickyNote className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold text-lg text-card-foreground">Notes</h3>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg border">
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {currentModel.notes}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Related files (view mode) */}
          {(!isEditing && Array.isArray(currentModel.related_files) && currentModel.related_files.length > 0) && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold text-lg text-card-foreground">Related Files</h3>
                </div>
                <div className="space-y-2">
                  {currentModel.related_files.map((path, idx) => (
                    <div key={`view-related-${idx}`} className="flex items-center justify-between gap-2 p-3 bg-muted/30 rounded-lg border">
                      <div className="min-w-0">
                        <p className="font-medium break-all">{path}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={(e) => {
                          e.stopPropagation();
                          // Use shared triggerDownload which will normalize the path and trigger the browser download
                          triggerDownload(path, e.nativeEvent);
                        }}>
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {currentModel.source && (
            <>
              <Separator />
              {/* Source Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold text-lg text-card-foreground">Source</h3>
                </div>
                <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border">
                  <div className="flex items-center justify-center w-10 h-10 bg-background rounded-lg border">
                    <ExternalLink className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">Downloaded from:</p>
                    <a
                      href={currentModel.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:text-primary/80 transition-colors break-all"
                    >
                      {currentModel.source}
                    </a>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="shrink-0"
                  >
                    <a
                      href={currentModel.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Visit
                    </a>
                  </Button>
                </div>
              </div>
            </>
          )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}