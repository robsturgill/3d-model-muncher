import { useState, useEffect, useRef } from "react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { AspectRatio } from "./ui/aspect-ratio";
import { ModelViewer3D } from "./ModelViewer3D";
import { ModelViewerErrorBoundary } from "./ErrorBoundary";
import { compressImageFile } from "../utils/imageUtils";
import { ImageWithFallback } from "./ImageWithFallback";
import { Clock, Weight, HardDrive, Layers, Droplet, Diameter, Edit3, Save, X, FileText, Tag, Box, Images, ChevronLeft, ChevronRight, Maximize2, StickyNote, ExternalLink, Globe, DollarSign, Store, CheckCircle, Ban, User, RefreshCw, Plus, List, MinusCircle, Upload, ChevronDown, ChevronUp, Codesandbox } from "lucide-react";
import TagsInput from "./TagsInput";
import { Download } from "lucide-react";
import { toast } from 'sonner';
import type { Collection } from "../types/collection";
import { triggerDownload } from "../utils/downloadUtils";

interface ModelDetailsDrawerProps {
  model: Model | null;
  isOpen: boolean;
  onClose: () => void;
  onModelUpdate: (model: Model) => void;
  defaultModelView?: '3d' | 'images';
  categories: Category[];
  defaultModelColor?: string | null;
}

export function ModelDetailsDrawer({
  model,
  isOpen,
  onClose,
  onModelUpdate,
  defaultModelView = 'images',
  defaultModelColor = null,
  categories
}: ModelDetailsDrawerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedModel, setEditedModel] = useState<Model | null>(null);
  const [invalidRelated, setInvalidRelated] = useState<string[]>([]);
  const [serverRejectedRelated, setServerRejectedRelated] = useState<string[]>([]);
  const [relatedVerifyStatus, setRelatedVerifyStatus] = useState<Record<number, {loading: boolean; ok?: boolean; message?: string}>>({});
  // Track whether a related file has an associated munchie JSON we can view
  const [availableRelatedMunchie, setAvailableRelatedMunchie] = useState<Record<number, boolean>>({});
  // ScrollArea viewport ref so we can programmatically scroll the drawer
  const detailsViewportRef = useRef<HTMLDivElement | null>(null);
  // Tag input state now managed by shared TagsInput
  const [focusRelatedIndex, setFocusRelatedIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | 'images'>(defaultModelView);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
      
  const [restoreOriginalDescription, setRestoreOriginalDescription] = useState(false);
  const originalTopLevelDescriptionRef = useRef<string | null>(null);
  const originalUserDefinedDescriptionRef = useRef<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // Add-to-Collection UI state
  const [isAddToCollectionOpen, setIsAddToCollectionOpen] = useState(false);
  const [addTargetCollectionId, setAddTargetCollectionId] = useState<string | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  // Remove-from-Collection UI state
  const [isRemoveFromCollectionOpen, setIsRemoveFromCollectionOpen] = useState(false);
  const [removeTargetCollectionId, setRemoveTargetCollectionId] = useState<string | null>(null);
  
  // G-code upload state
  const gcodeInputRef = useRef<HTMLInputElement>(null);
  const [isGcodeExpanded, setIsGcodeExpanded] = useState(false);
  const [isUploadingGcode, setIsUploadingGcode] = useState(false);
  const [gcodeOverwriteDialog, setGcodeOverwriteDialog] = useState<{open: boolean; file: File | null; existingPath: string}>({
    open: false,
    file: null,
    existingPath: ''
  });

  useEffect(() => {
    if (!isOpen) return;
    // Load collections when the drawer opens so we can offer Add-to-Collection.
    (async () => {
      try {
        const resp = await fetch('/api/collections', { cache: 'no-store' });
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.success && Array.isArray(data.collections)) setCollections(data.collections);
        }
      } catch {/* ignore */}
    })();
  }, [isOpen]);


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
      // no-op for newTag
      setSelectedImageIndexes([]);
    }
  }, [isOpen, defaultModelView]);

  // Helper to derive the munchie json path for a related file path
  const deriveMunchieCandidate = (raw: string) => {
    let candidate = raw || '';
    try {
      // G-code files (.gcode and .gcode.3mf) don't have munchie JSON files
      if (candidate.endsWith('.gcode') || candidate.endsWith('.gcode.3mf')) {
        return null;
      }
      
      if (candidate.endsWith('.3mf')) {
        candidate = candidate.replace(/\.3mf$/i, '-munchie.json');
      } else if (/\.stl$/i.test(candidate)) {
        candidate = candidate.replace(/\.stl$/i, '-stl-munchie.json');
      } else {
        // For any other file type, don't try to find a munchie file
        return null;
      }
      // strip leading /models/ if present
      if (candidate.startsWith('/models/')) candidate = candidate.replace(/^\/models\//, '');
      if (candidate.startsWith('models/')) candidate = candidate.replace(/^models\//, '');
    } catch (e) {
      // ignore and return as-is
      return null;
    }
    return candidate;
  };

  // Probe for munchie JSON existence for related files when in view mode
  useEffect(() => {
    if (isEditing) return;
    const rel = model?.related_files || [];
    if (!Array.isArray(rel) || rel.length === 0) return;

    let cancelled = false;
    (async () => {
      const map: Record<number, boolean> = {};
      await Promise.all(rel.map(async (p: string, idx: number) => {
        try {
          const candidate = deriveMunchieCandidate(p);
          // If no munchie candidate (e.g., .gcode files), mark as unavailable
          if (!candidate) {
            map[idx] = false;
            return;
          }
          const url = `/models/${candidate}`;
          // Try a HEAD first to minimize payload; fall back to GET if not allowed
          const resp = await fetch(url, { method: 'HEAD', cache: 'no-store' });
          map[idx] = resp.ok;
        } catch (e) {
          try {
            // Fallback to GET check
            const candidate = deriveMunchieCandidate(p);
            if (!candidate) {
              map[idx] = false;
              return;
            }
            const resp2 = await fetch(`/models/${candidate}`, { method: 'GET', cache: 'no-store' });
            map[idx] = resp2.ok;
          } catch (e2) {
            map[idx] = false;
          }
        }
      }));
      if (!cancelled) setAvailableRelatedMunchie(map);
    })();
    return () => { cancelled = true; };
  }, [isEditing, model?.related_files]);



  // In-window "fullscreen" (cover the browser viewport) for image previews
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  // Thumbnail strip container ref (used to programmatically scroll thumbnails into view)
  const thumbnailStripRef = useRef<HTMLDivElement | null>(null);
  const prevButtonRef = useRef<any>(null);
  const [isWindowFullscreen, setIsWindowFullscreen] = useState(false);
  // Ref mirror to synchronously track fullscreen state (avoids React state update race)
  const isWindowFullscreenRef = useRef<boolean>(false);
  // Hold a pending captured image if we need to start edit mode first
  const pendingCapturedImageRef = useRef<string | null>(null);

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
    // Remember whether the original model had a top-level thumbnail when entering edit mode.
    // This is important for correctly splitting the combined gallery back into
    // parsed top-level images vs userDefined images, even if the thumbnail value
    // may be empty or later changed by the user during editing.
    const originalThumbnailExistsRef = useRef<boolean>(false);
    // Snapshot of the parsed (server-provided) top-level images captured when
    // entering edit mode. We use this to reliably classify images as parsed vs
    // user-provided when splitting the combined gallery after reordering or
    // deletion. Relying on the snapshot is more robust than using current
    // thumbnail or counts which may change during editing.
    const parsedImagesSnapshotRef = useRef<string[]>([]);
  // In-edit combined gallery allowing arbitrary visual ordering while
  // keeping the canonical storage split (parsed vs userDefined) only on save.
  // When non-null, this array is used by the UI as the gallery source during
  // edit mode and is mutated by drag/drop. It is finally split back into
  // top-level images and userDefined.images on save.
  const [inlineCombined, setInlineCombined] = useState<string[] | null>(null);
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

          // Apply to editedModel: store user-added images under userDefined.images and
          // update imageOrder descriptors so the new images are represented as
          // `user:<index>` tokens. Also update inlineCombined (UI-only ordering)
          // so new images appear at the end of the gallery in edit mode.
          setEditedModel(prev => {
            if (!prev) return prev;
            
            // Ensure userDefined is an object; use existing if present
            const udObj = (prev as any).userDefined && typeof (prev as any).userDefined === 'object'
              ? { ...(prev as any).userDefined }
              : {};

            // userDefined.images will hold user-added images (data URLs)
            const existingUserImages = Array.isArray(udObj.images) ? (udObj.images as any[]).slice() : [];

            // Append the new user images to the userDefined object
            const updatedUserImages = existingUserImages.concat(newDataUrls);

            // Get current imageOrder or build it
            const currentOrder = Array.isArray(udObj.imageOrder) ? (udObj.imageOrder as any[]).slice() : buildImageOrderFromModel(prev as Model);

            // Add descriptors for new user images
            const newUserDescriptors = newDataUrls.map((_, index) => `user:${existingUserImages.length + index}`);

            const updatedOrder = currentOrder.concat(newUserDescriptors);

            // Update userDefined with new images and order
            udObj.images = updatedUserImages;
            udObj.imageOrder = updatedOrder;

            // If no thumbnail is set and this is the first image, set it as thumbnail
            if ((!currentOrder.length || !udObj.thumbnail) && newUserDescriptors.length > 0) {
              udObj.thumbnail = newUserDescriptors[0]; // First added image becomes thumbnail
            }

            return { ...prev, userDefined: udObj } as Model;
          });

          // Update inlineCombined (UI) to reflect the appended items
          setInlineCombined(prev => {
            if (!prev) {
              // Build from current model using new structure
              const parsed = Array.isArray((editedModel as any)?.parsedImages) ? (editedModel as any).parsedImages : [];
              const existing = Array.isArray((editedModel as any)?.userDefined?.images)
                ? (editedModel as any).userDefined.images.map((u: any) => getUserImageData(u))
                : [];
              const base = [...parsed, ...existing];
              return base.concat(newDataUrls);
            }
            return [...prev, ...newDataUrls];
          });

          // Compute the index of the last item added in the gallery deterministically.
          // Gallery is constructed as: [top-level thumbnail, ...top-level images, ...userDefined.images]
          const parsedCount = parsedImageCountRef.current;
          // Count existing user images before this operation (use editedModel snapshot)
          const userImagesBefore = Array.isArray(((editedModel as any)?.userDefined?.images))
            ? (editedModel as any).userDefined.images.length
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

      // Compute the full images array (thumbnail + additional images) from the
      // currently-displayed model. During edit mode prefer the in-edit
      // `inlineCombined` ordering when present so the UI can show arbitrary
      // placements; otherwise build from the model state.
      // Helper: extract data URL from userDefined image entry (supports legacy string and new object form)
      const getUserImageData = (entry: any) => {
        if (!entry) return '';
        if (typeof entry === 'string') return entry;
        if (typeof entry === 'object' && typeof entry.data === 'string') return entry.data;
        return '';
      };
      // Resolve a descriptor to actual image data for the new parsedImages structure
      const resolveDescriptorToData = (desc: string | undefined, m: Model): string | undefined => {
        if (!desc) return undefined;
        
        // Get parsedImages (new structure) or fall back to legacy
        const parsedImages = Array.isArray(m.parsedImages) ? m.parsedImages : [];
        const legacyImages = Array.isArray(m.images) ? m.images : [];
  const userArr = Array.isArray((m as any).userDefined?.images) ? (m as any).userDefined.images : [];

        if (desc.startsWith('parsed:')) {
          const idx = parseInt(desc.split(':')[1] || '', 10);
          // Try new structure first, then fall back to legacy
          if (!isNaN(idx)) {
            if (parsedImages[idx]) return parsedImages[idx];
            // For backward compatibility, check legacy structure
            if (idx === 0 && m.thumbnail) return m.thumbnail;
            if (legacyImages[idx - 1]) return legacyImages[idx - 1]; // offset by 1 since legacy had thumbnail separate
          }
          return undefined;
        }

        if (desc.startsWith('user:')) {
          const idx = parseInt(desc.split(':')[1] || '', 10);
          if (!isNaN(idx) && userArr[idx] !== undefined) return getUserImageData(userArr[idx]);
          return undefined;
        }

        // For backward compatibility, treat non-descriptor strings as literal data URLs
        return desc;
      };

      // Simplified image ordering resolution for new structure
      const resolveImageOrderToUrls = (m: Model) => {
  const order = Array.isArray((m as any).userDefined?.imageOrder) ? (m as any).userDefined.imageOrder : undefined;
        if (!m || !order || order.length === 0) return null;

        const urls: string[] = [];
        for (const desc of order) {
          if (typeof desc !== 'string') continue;
          const resolved = resolveDescriptorToData(desc, m);
          if (resolved) urls.push(resolved);
        }
        return urls.length > 0 ? urls : null;
      };

      // Simplified imageOrder builder for new structure
      const buildImageOrderFromModel = (m: Model) => {
        const result: string[] = [];
        if (!m) return result;
        
        // Use new parsedImages structure when available
        const parsedImages = Array.isArray(m.parsedImages) ? m.parsedImages : [];
        const userArr = Array.isArray((m as any).userDefined?.images) ? (m as any).userDefined.images : [];
        
        // Add parsed image descriptors
        for (let i = 0; i < parsedImages.length; i++) {
          result.push(`parsed:${i}`);
        }
        
        // Add user image descriptors
        for (let i = 0; i < userArr.length; i++) {
          result.push(`user:${i}`);
        }
        
        // For backward compatibility with legacy structure (when parsedImages doesn't exist)
        if (parsedImages.length === 0) {
          const legacyImages = Array.isArray(m.images) ? m.images : [];
          const thumbnail = m.thumbnail;
          
          // If there's a thumbnail, add it as parsed:0
          if (thumbnail) {
            result.push('parsed:0');
          }
          
          // Add legacy images as parsed:1, parsed:2, etc.
          for (let i = 0; i < legacyImages.length; i++) {
            result.push(`parsed:${i + (thumbnail ? 1 : 0)}`);
          }
        }
        
        return result;
      };

      const allImages = (() => {
        if (isEditing && inlineCombined) return inlineCombined.slice();
        const src = editedModel || model;
        if (!src) return [];

        // SIMPLIFIED: Use new parsedImages structure when available
        const parsedImages = Array.isArray(src.parsedImages) ? src.parsedImages : [];
        const userImages = Array.isArray((src as any).userDefined?.images)
          ? (src as any).userDefined.images.map((u: any) => getUserImageData(u))
          : [];

        // If we have custom image ordering, use it
        const resolved = resolveImageOrderToUrls(src as Model);
        if (resolved && resolved.length > 0) return resolved;

        // For new structure: parsedImages + userImages
        if (parsedImages.length > 0) {
          return [...parsedImages, ...userImages];
        }

        // Fallback to legacy structure for backward compatibility
        const legacyImages = Array.isArray(src.images) ? src.images : [];
        const thumbnail = src.thumbnail ? [src.thumbnail] : [];
        return [...thumbnail, ...legacyImages, ...userImages];
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
    // Reorder descriptors only. Determine the current descriptor array (imageOrder)
    // or build an initial one for legacy models.
    const currentDescriptors = Array.isArray((editedModel as any).userDefined?.imageOrder)
      ? (editedModel as any).userDefined.imageOrder.slice()
      : buildImageOrderFromModel(editedModel);

    // bounds check against descriptor length
    if (sourceIndex < 0 || sourceIndex >= currentDescriptors.length || targetIndex < 0 || targetIndex >= currentDescriptors.length) {
      setDragOverIndex(null);
      return;
    }

    // perform descriptor reordering (move source -> target)
    const descItem = currentDescriptors.splice(sourceIndex, 1)[0];
    currentDescriptors.splice(targetIndex, 0, descItem);
    // Determine if the new first descriptor references a user or parsed image
    // so we can persist it as userDefined.thumbnail (descriptor form).
    let firstDescriptor: string | undefined = undefined;
    if (currentDescriptors.length > 0 && typeof currentDescriptors[0] === 'string') {
      firstDescriptor = currentDescriptors[0] as string;
    }
    // Try to normalize a literal (non-descriptor) into a descriptor using
    // the current editedModel snapshot (prefer user images). We resolve the
    // effective first image using the reordered `currentDescriptors` so that
    // any index changes are accounted for.
    let normalizedThumbDescriptor: string | undefined = undefined;
    try {
      // Build a temporary userDefined object snapshot (new canonical shape)
      const tempUdObj = (editedModel as any).userDefined && typeof (editedModel as any).userDefined === 'object'
        ? { ...(editedModel as any).userDefined }
        : {};
      tempUdObj.imageOrder = currentDescriptors;
      const tempModelForResolve = { ...(editedModel as any), userDefined: tempUdObj } as Model;
      const resolvedUrls = resolveImageOrderToUrls(tempModelForResolve) || [];
      const firstUrl = resolvedUrls[0];
      if (firstUrl) {
        const parsedSnapshot = parsedImagesSnapshotRef.current || [];
        const userArr = Array.isArray((editedModel as any)?.userDefined?.images) ? (editedModel as any).userDefined.images : [];
        const uidx = userArr.findIndex((u: any) => getUserImageData(u) === firstUrl);
        if (uidx !== -1) normalizedThumbDescriptor = `user:${uidx}`;
        else {
          const pidx = parsedSnapshot.indexOf(firstUrl);
          if (pidx !== -1) normalizedThumbDescriptor = `parsed:${pidx}`;
        }
      } else if (firstDescriptor) {
        // If we couldn't resolve via order, fall back to heuristics using
        // the literal firstDescriptor value.
        if (/^(user:|parsed:)/.test(firstDescriptor)) {
          normalizedThumbDescriptor = firstDescriptor;
        } else {
          const parsed = Array.isArray(editedModel?.images) ? editedModel.images : [];
          const userArr = Array.isArray((editedModel as any)?.userDefined?.images) ? (editedModel as any).userDefined.images : [];
          const pidx = parsed.indexOf(firstDescriptor);
          if (pidx !== -1) normalizedThumbDescriptor = `parsed:${pidx}`;
          else {
            const uidx = userArr.findIndex((u: any) => getUserImageData(u) === firstDescriptor);
            if (uidx !== -1) normalizedThumbDescriptor = `user:${uidx}`;
          }
        }
      }
    } catch (e) {
      // leave normalizedThumbDescriptor undefined on failure
      normalizedThumbDescriptor = undefined;
    }

    // Fallback: if we couldn't derive a normalized thumbnail but the user
    // moved a descriptor into the first slot, prefer that moved descriptor
    // when it's already a concrete token like 'parsed:N' or 'user:N'. This
    // ensures a drag of parsed:2 -> index 0 updates the nested thumbnail.
    if (!normalizedThumbDescriptor && targetIndex === 0 && typeof descItem === 'string') {
      if (/^(user:\d+|parsed:\d+)$/.test(descItem)) {
        normalizedThumbDescriptor = descItem;
      } else {
        // try to map literal value to parsed/user
        const parsedSnapshot = parsedImagesSnapshotRef.current || [];
          const userArr = Array.isArray((editedModel as any)?.userDefined?.images) ? (editedModel as any).userDefined.images : [];
        const pidx = parsedSnapshot.indexOf(descItem);
        if (pidx !== -1) normalizedThumbDescriptor = `parsed:${pidx}`;
        else {
          const uidx = userArr.findIndex((u: any) => getUserImageData(u) === descItem);
          if (uidx !== -1) normalizedThumbDescriptor = `user:${uidx}`;
        }
      }
    }

      // Update editedModel to set imageOrder and optionally update nested thumbnail
      // Debug: log normalization result so we can see what the UI computed on drop
      try {
        console.debug('DEBUG handleDrop: currentDescriptors =', currentDescriptors);
        console.debug('DEBUG handleDrop: firstDescriptor =', firstDescriptor, 'normalizedThumbDescriptor =', normalizedThumbDescriptor, 'descItem =', descItem);
      } catch (e) {
        // ignore debug errors
      }

      setEditedModel(prev => {
      if (!prev) return prev;
      const udObj = prev.userDefined && typeof prev.userDefined === 'object' ? { ...(prev.userDefined as any) } : {};
      udObj.imageOrder = currentDescriptors;
      // Only set nested thumbnail if we determined a safe descriptor
      if (typeof normalizedThumbDescriptor === 'string') {
        // Avoid overwriting an explicit nested thumbnail unless it changed
        if (udObj.thumbnail !== normalizedThumbDescriptor) {
          udObj.thumbnail = normalizedThumbDescriptor as any;
        }
      }
      const updated = { ...prev, userDefined: udObj } as any;
      return updated as Model;
    });

    // Update inlineCombined (UI) to reflect new order by resolving descriptors
    const tempUdObj2 = (editedModel as any).userDefined && typeof (editedModel as any).userDefined === 'object'
      ? { ...(editedModel as any).userDefined }
      : {};
    tempUdObj2.imageOrder = currentDescriptors;
    const tempModelForResolve = { ...editedModel, userDefined: tempUdObj2 } as Model;
    const resolved = resolveImageOrderToUrls(tempModelForResolve) || [];
    setInlineCombined(resolved);
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

  // G-code upload handler
  const handleGcodeUpload = async (file: File, forceOverwrite = false) => {
    if (!currentModel?.filePath) {
      toast.error('Model file path is required');
      return;
    }

    setIsUploadingGcode(true);
    try {
      // Load config to get storage behavior settings
      const configResp = await fetch('/api/load-config');
      let storageMode = 'parse-only';
      let autoOverwrite = false;
      
      if (configResp.ok) {
        const configData = await configResp.json();
        storageMode = configData.config?.settings?.gcodeStorageBehavior || 'parse-only';
        autoOverwrite = configData.config?.settings?.gcodeOverwriteBehavior === 'overwrite';
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('modelFilePath', currentModel.filePath);
      // Send the actual model file path (from modelUrl) for G-code save location
      if (currentModel.modelUrl) {
        formData.append('modelFileUrl', currentModel.modelUrl);
      }
      formData.append('storageMode', storageMode);
      
      if (forceOverwrite || autoOverwrite) {
        formData.append('overwrite', 'true');
      }

      // Upload and parse
      const response = await fetch('/api/parse-gcode', {
        method: 'POST',
        body: formData
      });
      
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error('[G-code Upload] Failed to parse JSON:', parseError);
        toast.error('Server returned invalid response');
        return;
      }

      // Check for file exists prompt (can happen with 200 OK status)
      if (result.fileExists && !forceOverwrite) {
        setGcodeOverwriteDialog({
          open: true,
          file,
          existingPath: result.existingPath || ''
        });
        return;
      }

      if (!response.ok) {
        console.error('[G-code Upload] Non-OK response:', response.status, result);
        toast.error(result.error || `Server error: ${response.status}`);
        return;
      }

      if (result.success && result.gcodeData) {
        // Build changes object for save-model API
        const changes: any = {
          filePath: currentModel.filePath,
          id: currentModel.id,
          gcodeData: result.gcodeData,
          // Also update legacy fields for backward compatibility
          printTime: result.gcodeData.printTime || currentModel.printTime,
          filamentUsed: result.gcodeData.totalFilamentWeight || currentModel.filamentUsed
        };

        // If storage mode is save-and-link, add to related_files
        if (storageMode === 'save-and-link' && result.gcodeData.gcodeFilePath) {
          const relatedFiles = Array.isArray(currentModel.related_files) 
            ? [...currentModel.related_files] 
            : [];
          
          // Normalize paths for comparison to avoid duplicates with different separators
          const normalizePath = (p: string) => p.replace(/\\/g, '/').replace(/^\/+/, '');
          const normalizedNewPath = normalizePath(result.gcodeData.gcodeFilePath);
          const alreadyExists = relatedFiles.some(
            (existing: string) => normalizePath(existing) === normalizedNewPath
          );
          
          if (!alreadyExists) {
            relatedFiles.push(result.gcodeData.gcodeFilePath);
            changes.related_files = relatedFiles;
          }
        }

        // Save updated model using the correct API format
        const saveResp = await fetch('/api/save-model', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changes)
        });

        if (saveResp.ok) {
          toast.success('G-code parsed and saved successfully');
          // Update the model in UI with the merged changes
          const updatedModel = { ...currentModel, ...changes };
          onModelUpdate(updatedModel);
        } else {
          const saveError = await saveResp.json().catch(() => ({ error: 'Unknown error' }));
          toast.error(`Failed to save G-code data: ${saveError.error || saveResp.statusText}`);
        }
      } else {
        console.error('[G-code Upload] Unexpected response:', { success: result.success, hasGcodeData: !!result.gcodeData });
        toast.error('Unexpected server response');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      toast.error(`Upload failed: ${errorMsg}`);
    } finally {
      setIsUploadingGcode(false);
    }
  };

  // Re-analyze existing G-code
  const handleReanalyzeGcode = async () => {
    if (!currentModel?.gcodeData?.gcodeFilePath) {
      toast.error('No G-code file path found');
      return;
    }

    setIsUploadingGcode(true);
    try {
      const formData = new FormData();
      formData.append('modelFilePath', currentModel.filePath);
      formData.append('gcodeFilePath', currentModel.gcodeData.gcodeFilePath);
      formData.append('storageMode', 'parse-only');

      const response = await fetch('/api/parse-gcode', {
        method: 'POST',
        body: formData
      });
      
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        toast.error('Server returned invalid response');
        return;
      }

      if (result.success && result.gcodeData) {
        // Build changes object for save-model API
        const changes: any = {
          filePath: currentModel.filePath,
          id: currentModel.id,
          gcodeData: result.gcodeData,
          printTime: result.gcodeData.printTime || currentModel.printTime,
          filamentUsed: result.gcodeData.totalFilamentWeight || currentModel.filamentUsed
        };

        const saveResp = await fetch('/api/save-model', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changes)
        });

        if (saveResp.ok) {
          toast.success('G-code re-analyzed successfully');
          // Update the model in UI with the merged changes
          const updatedModel = { ...currentModel, ...changes };
          onModelUpdate(updatedModel);
        } else {
          const saveError = await saveResp.json().catch(() => ({ error: 'Unknown error' }));
          toast.error(`Failed to save re-analyzed G-code data: ${saveError.error || saveResp.statusText}`);
        }
      } else {
        toast.error(result.error || 'Failed to re-analyze G-code');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      toast.error(`Re-analysis failed: ${errorMsg}`);
    } finally {
      setIsUploadingGcode(false);
    }
  };

  // Handle drag and drop for G-code
  const handleGcodeDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleGcodeDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (file && (file.name.toLowerCase().endsWith('.gcode') || file.name.toLowerCase().endsWith('.gcode.3mf'))) {
      handleGcodeUpload(file);
    } else {
      toast.error('Please drop a .gcode or .gcode.3mf file');
    }
  };

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
    // Prefer a user-provided description stored in userDefined
    let initialDescription = (srcModel as any).description;
    try {
      const ud = (srcModel as any).userDefined;
      if (ud && typeof ud === 'object' && typeof ud.description === 'string') {
        initialDescription = ud.description;
      }
    } catch (e) {
      // ignore and fallback to top-level description
    }

    // stash originals so the edit UI can toggle restoring the top-level description
    originalTopLevelDescriptionRef.current = typeof (srcModel as any).description === 'string' ? (srcModel as any).description : null;
    try {
      const ud = (srcModel as any).userDefined;
      if (ud && typeof ud === 'object' && Object.prototype.hasOwnProperty.call(ud, 'description')) {
        originalUserDefinedDescriptionRef.current = typeof ud.description === 'string' ? ud.description : null;
      } else {
        originalUserDefinedDescriptionRef.current = null;
      }
    } catch (e) {
      originalUserDefinedDescriptionRef.current = null;
    }
    setRestoreOriginalDescription(false);

    // Ensure editedModel uses the new parsedImages structure
    const { images: legacyImages, ...srcModelWithoutImages } = srcModel;
    const parsedImages = Array.isArray(srcModel.parsedImages) 
      ? srcModel.parsedImages 
      : (Array.isArray(legacyImages) ? legacyImages : []);

    setEditedModel({ 
      ...srcModelWithoutImages, 
      filePath: jsonFilePath,
      tags: srcModel.tags || [], // Ensure tags is always an array
      description: initialDescription,
      parsedImages: parsedImages // Use new structure
    } as Model);
    // Capture how many images came from parsing (top-level images). We need
    // to detect whether the existing `thumbnail` value is one of the parsed
    // top-level images or whether it already points into the userDefined
    // images. This disambiguation is important so we don't accidentally treat
    // userDefined images as parsed when splitting the combined gallery later.
    const parsedImgs = parsedImages; // Use the parsedImages we just established
    // If thumbnail matches one of the parsed images by reference/value, then
    // the server produced a true top-level thumbnail. Otherwise, if the
    // thumbnail appears in userDefined.images, treat it as a user image.
    const udImgs = Array.isArray((srcModel as any).userDefined?.images) ? (srcModel as any).userDefined.images : [];
    const thumbnailVal = srcModel.thumbnail;
    const thumbnailIsParsed = typeof thumbnailVal === 'string' && thumbnailVal !== '' && parsedImgs.includes(thumbnailVal);
    const thumbnailIsUser = typeof thumbnailVal === 'string' && thumbnailVal !== '' && udImgs.includes(thumbnailVal);

    if (thumbnailIsParsed) {
      // thumbnail is counted as part of parsedImageCount (as "1"), so include it
      parsedImageCountRef.current = 1 + parsedImgs.length;
      originalThumbnailExistsRef.current = true;
    } else if (thumbnailIsUser) {
      // thumbnail actually comes from userDefined.images; treat parsed images
      // as only the parsedImgs array (no top-level thumbnail)
      parsedImageCountRef.current = parsedImgs.length;
      originalThumbnailExistsRef.current = false;
    } else {
      // No thumbnail or unknown string: fall back to conservative count
      parsedImageCountRef.current = (srcModel.thumbnail ? 1 : 0) + parsedImgs.length;
      originalThumbnailExistsRef.current = !!srcModel.thumbnail;
    }
    // Capture a snapshot of the parsed image values so we can reliably
    // classify images later even if the thumbnail or counts change in edit mode.
    parsedImagesSnapshotRef.current = parsedImgs.slice();
    // Initialize inlineCombined. Prefer an explicit imageOrder when present
    // so edit mode reflects the canonical ordering. For legacy files without
    // imageOrder we intentionally show only the top-level thumbnail + parsed
    // images (userDefined images were not present for legacy files).
    const resolvedFromOrder = resolveImageOrderToUrls(srcModel as Model);
    if (resolvedFromOrder && resolvedFromOrder.length > 0) {
      setInlineCombined(resolvedFromOrder);
    } else {
      const initialCombined = [srcModel.thumbnail, ...parsedImgs].filter((img): img is string => Boolean(img));
      setInlineCombined(initialCombined);
    }
    // Clear any previous image selections when entering edit mode
    setSelectedImageIndexes([]);
    setIsEditing(true);
  };

  // Insert a captured image data URL into editedModel similar to a user upload.
  const insertCapturedImageIntoEditedModel = (dataUrl: string) => {
    if (!editedModel) {
      // Shouldn't happen; caller ensures editedModel exists or will call startEditing
      return;
    }

    // Ensure userDefined structure exists
    const udObj = (editedModel as any).userDefined && typeof (editedModel as any).userDefined === 'object'
      ? { ...(editedModel as any).userDefined }
      : {};

    const existingUserImages: any[] = Array.isArray(udObj.images) ? udObj.images.slice() : [];
    // Push the new captured image as a simple data URL entry (legacy string form supported)
    existingUserImages.push(dataUrl);
    udObj.images = existingUserImages;

    // Build or extend imageOrder to include a descriptor for the new user image.
    const currentOrder: string[] = Array.isArray(udObj.imageOrder) ? udObj.imageOrder.slice() : buildImageOrderFromModel(editedModel);
    const newUserIndex = existingUserImages.length - 1;
    currentOrder.push(`user:${newUserIndex}`);
    udObj.imageOrder = currentOrder;

    const nextModel = { ...(editedModel as any), userDefined: udObj } as Model;

    // Update edited model and UI gallery (inlineCombined) so the new image appears immediately.
    setEditedModel(nextModel);
    const resolved = resolveImageOrderToUrls(nextModel) || [];
    setInlineCombined(resolved);
    // Select the newly-added image
    setSelectedImageIndex(resolved.length - 1);
    setSelectedImageIndexes([]);
    try { toast.success('Captured image added to model\'s gallery'); } catch (e) { /* ignore */ }
  };

  const cancelEditing = () => {
    setEditedModel(null);
    setIsEditing(false);
    // no-op for newTag
    setSelectedImageIndexes([]);
    setInlineCombined(null);
  };

  // Called by ModelViewer3D when user captures the current canvas as a PNG data URL.
  const handleCapturedImage = (dataUrl: string) => {
    // If not editing yet, stash and start editing. Once editedModel is created,
    // a useEffect below will consume pendingCapturedImageRef and insert it.
    pendingCapturedImageRef.current = dataUrl;
    if (!isEditing) {
      startEditing();
    } else if (editedModel) {
      insertCapturedImageIntoEditedModel(dataUrl);
      pendingCapturedImageRef.current = null;
    }
  };

  // When editedModel becomes available after startEditing(), check for a pending capture
  useEffect(() => {
    if (pendingCapturedImageRef.current && editedModel) {
      const dataUrl = pendingCapturedImageRef.current;
      pendingCapturedImageRef.current = null;
      insertCapturedImageIntoEditedModel(dataUrl);
    }
  }, [editedModel]);

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

    // Ensure we persist a nested thumbnail descriptor when the user has
    // reordered images such that the first image in imageOrder should be
    // the thumbnail. This guarantees the nested thumbnail change is
    // detected by the diff below and included in the save payload.
    try {
      const udExists = editedForSave.userDefined && typeof editedForSave.userDefined === 'object';
      const ud0 = udExists ? editedForSave.userDefined : undefined;
      // Prefer an explicit imageOrder on the edited model. If it's not present
      // (possible when a state update hasn't flushed yet), attempt to build a
      // best-effort imageOrder from the current edited model so we can derive
      // a nested thumbnail descriptor reliably.
      let imageOrder = ud0 && Array.isArray(ud0.imageOrder) ? ud0.imageOrder : undefined;
      try {
        if ((!imageOrder || imageOrder.length === 0) && typeof buildImageOrderFromModel === 'function') {
          imageOrder = buildImageOrderFromModel(editedForSave as Model);
        }
      } catch (e) {
        // ignore - fall back to not deriving a thumbnail
        imageOrder = imageOrder;
      }

      if (imageOrder && imageOrder.length > 0) {
        const first = imageOrder[0];
        let derived: string | undefined = undefined;
        if (typeof first === 'string') {
          if (/^(user:|parsed:)/.test(first)) {
            derived = first;
          } else {
            // Try to match literal value against userDefined images
            const candidateUserImgs = ud0 && Array.isArray(ud0.images) ? ud0.images : (Array.isArray(edited.userDefined?.images) ? edited.userDefined.images : []);
            const userIdx = candidateUserImgs.findIndex((u: any) => getUserImageData(u) === first);
            if (userIdx !== -1) derived = `user:${userIdx}`;
            else {
              // Try to match against parsed top-level images
              const parsedArr = Array.isArray(edited.images) ? edited.images : [];
              const pidx = parsedArr.indexOf(first);
              if (pidx !== -1) derived = `parsed:${pidx}`;
            }
          }
        }

        if (typeof derived !== 'undefined') {
          // Ensure userDefined exists and preserve images
          const copy0 = ud0 && typeof ud0 === 'object' ? { ...(ud0 as any) } : {};
          // Preserve images array if present
          if (ud0 && Array.isArray(ud0.images)) copy0.images = ud0.images;
          copy0.thumbnail = derived;
          editedForSave.userDefined = copy0;
        }
      }
    } catch (e) {
      // Defensive: if thumbnail derivation fails, continue without blocking save
      console.warn('Failed to derive nested thumbnail from imageOrder before save:', e);
    }

    // Enforce: always set userDefined.thumbnail to the first descriptor in
    // userDefined.imageOrder after recalculating imageOrder if necessary.
    try {
      const udExists2 = editedForSave.userDefined && typeof editedForSave.userDefined === 'object';
      const udObj2 = udExists2 ? { ...(editedForSave.userDefined as any) } : {};
      let imageOrderFinal = Array.isArray(udObj2.imageOrder) ? udObj2.imageOrder : undefined;
      try {
        if ((!imageOrderFinal || imageOrderFinal.length === 0) && typeof buildImageOrderFromModel === 'function') {
          imageOrderFinal = buildImageOrderFromModel(editedForSave as Model);
        }
      } catch (e) {
        // ignore - fall back to existing order
        imageOrderFinal = imageOrderFinal;
      }
      if (Array.isArray(imageOrderFinal) && imageOrderFinal.length > 0) {
        udObj2.imageOrder = imageOrderFinal;
        // Always set nested thumbnail to the first descriptor in the final order
        udObj2.thumbnail = imageOrderFinal[0];
        editedForSave.userDefined = udObj2;
      }
    } catch (e) {
      console.warn('Failed to enforce nested thumbnail from recalculated imageOrder before save:', e);
    }

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

    // If the edited top-level thumbnail is a descriptor (user:, parsed:),
    // do not persist it to top-level; instead move it into userDefined.thumbnail
    // to ensure the actual parsed base64 thumbnail at top-level is preserved.
    if (typeof changes.thumbnail === 'string' && /^(user:|parsed:)/.test(changes.thumbnail)) {
      const descriptor = changes.thumbnail;
      delete changes.thumbnail;
      if (!changes.userDefined || typeof changes.userDefined !== 'object') changes.userDefined = {};
      // Only set if not already present to avoid overwriting nested thumbnail handling
      if (!changes.userDefined.thumbnail) changes.userDefined.thumbnail = descriptor;
    }

    // If the edited top-level thumbnail is a raw data URL or unknown string,
    // attempt to normalize it into a descriptor referencing userDefined images
    // or parsed images. In all cases we remove the top-level thumbnail from
    // the outgoing `changes` so we never send raw base64 blobs as the
    // canonical top-level thumbnail.
    if (typeof changes.thumbnail === 'string' && !/^(user:|parsed:)/.test(changes.thumbnail)) {
      const s = changes.thumbnail as string;
      let safeThumb: string | undefined = undefined;
      // Prefer images that are about to be sent in the same payload (changes.userDefined)
      const changeUDImgs = Array.isArray(changes.userDefined?.images)
        ? changes.userDefined.images
        : (Array.isArray(editedForSave.userDefined?.images) ? editedForSave.userDefined.images : []);
      const originalParsed = Array.isArray((original as any).images) ? (original as any).images : [];
      const originalTop = (original as any).thumbnail || '';

      if (s.startsWith('data:')) {
        const uidx = changeUDImgs.findIndex((u: any) => getUserImageData(u) === s);
        if (uidx !== -1) safeThumb = `user:${uidx}`;
        else if (originalTop && s === originalTop) safeThumb = 'parsed:0';
        else if (originalParsed.includes(s)) safeThumb = `parsed:${originalParsed.indexOf(s)}`;
      } else {
        // Non-data string: try to match against parsed or original thumbnail
        const pidx = originalParsed.indexOf(s);
        if (pidx !== -1) safeThumb = `parsed:${pidx}`;
        else if (s === originalTop) safeThumb = 'parsed:0';
      }

      if (typeof safeThumb !== 'undefined') {
        if (!changes.userDefined || typeof changes.userDefined !== 'object') changes.userDefined = {};
        changes.userDefined.thumbnail = safeThumb;
      }
      // Remove top-level thumbnail change in all cases to avoid sending raw data
      delete changes.thumbnail;
    }

    // Special-case: if the user explicitly checked "Restore original description"
    // we want to remove any user-defined description. This is expressed by
    // writing userDefined = [] into the changes payload. Otherwise, if the
    // top-level description changed, persist it into userDefined as the
    // canonical location for user edits (even if it's an empty string).
    if (restoreOriginalDescription) {
      // Preserve any user-added images while removing only the user-defined description.
      // If the edited model has userDefined images, keep them. Otherwise, clear userDefined.
      const editedUserDefined = (editedForSave as any).userDefined;
      const existingImages = Array.isArray(editedUserDefined?.images) ? editedUserDefined.images : undefined;
      if (existingImages !== undefined) {
        // Preserve images but indicate the description should be removed by
        // explicitly setting description to null in the payload.
        changes.userDefined = { ...(editedUserDefined || {}), images: existingImages };
        (changes.userDefined as any).description = null;
      } else {
        // No user images present; clear userDefined entirely (empty object)
        changes.userDefined = {};
        // Explicitly mark description as null so the server will remove it.
        (changes.userDefined as any).description = null;
      }
      // Ensure we don't accidentally send the top-level description
      delete changes.description;
    } else if (typeof changes.description !== 'undefined') {
      const desc = changes.description;
      // If the user cleared the description (empty or whitespace only), send
      // description: null so the server will remove the nested field.
      const isEmpty = typeof desc === 'string' && desc.trim() === '';
      if (isEmpty) {
        if (changes.userDefined && typeof changes.userDefined === 'object') {
          changes.userDefined = { ...(changes.userDefined as any), description: null };
        } else {
          changes.userDefined = { description: null };
        }
      } else {
        // Normal non-empty description: merge into userDefined as before
        if (changes.userDefined && typeof changes.userDefined === 'object') {
          changes.userDefined = { ...(changes.userDefined as any), description: desc };
        } else {
          changes.userDefined = { description: desc };
        }
      }
      delete changes.description;
    }

    // Ensure that if the edited model contains user-defined images, they are included
    // in the outgoing changes payload even if other userDefined fields weren't detected
    // as changed by the generic diff (defensive). This guarantees user-added images
    // are sent to the server.
    const editedUD = (editedForSave as any).userDefined;
    if (editedUD && Array.isArray(editedUD.images) && editedUD.images.length > 0) {
      // If changes.userDefined already exists, merge images into it, otherwise set it.
      if (changes.userDefined && typeof changes.userDefined === 'object') {
        changes.userDefined = { ...(changes.userDefined as any), images: editedUD.images };
      } else {
        changes.userDefined = { images: editedUD.images };
      }
    }

    // If changes.userDefined.thumbnail already exists but is a raw/data URL,
    // try to convert it into a descriptor using the outgoing images array.
    try {
      if (changes.userDefined && typeof (changes.userDefined as any).thumbnail === 'string' && !/^(user:|parsed:)/.test((changes.userDefined as any).thumbnail)) {
        const rawThumb = (changes.userDefined as any).thumbnail as string;
        const outgoingImgs = Array.isArray(changes.userDefined.images) ? (changes.userDefined as any).images : (Array.isArray(editedForSave.userDefined?.images) ? editedForSave.userDefined.images : []);
        const originalParsed = Array.isArray((original as any).images) ? (original as any).images : [];
        const originalTop = (original as any).thumbnail || '';
        let safeThumb: string | undefined = undefined;
        if (rawThumb.startsWith('data:')) {
          const uidx = outgoingImgs.findIndex((u: any) => getUserImageData(u) === rawThumb);
          if (uidx !== -1) safeThumb = `user:${uidx}`;
          else if (originalTop && rawThumb === originalTop) safeThumb = 'parsed:0';
          else if (originalParsed.includes(rawThumb)) safeThumb = `parsed:${originalParsed.indexOf(rawThumb)}`;
        } else {
          const pidx = originalParsed.indexOf(rawThumb);
          if (pidx !== -1) safeThumb = `parsed:${pidx}`;
          else if (rawThumb === originalTop) safeThumb = 'parsed:0';
        }
        if (typeof safeThumb !== 'undefined') {
          (changes.userDefined as any).thumbnail = safeThumb;
        } else {
          // If we can't safely convert, remove the raw thumbnail to avoid sending base64
          delete (changes.userDefined as any).thumbnail;
        }
      }
    } catch (e) {
      console.warn('Failed to normalize existing changes.userDefined.thumbnail:', e);
    }

    // Defensive fix: if the editedForSave contained a nested thumbnail but it
    // wasn't included in `changes.userDefined.thumbnail` yet, ensure we include
    // it now. Convert raw/data thumbnail values into descriptor form (user:N or parsed:N)
    // using the final images array that will be sent in this payload.
    try {
      const hasUdChanges = changes.userDefined && typeof changes.userDefined === 'object';
      const hasUdThumb = hasUdChanges && typeof (changes.userDefined as any).thumbnail !== 'undefined';
      const editedForSaveUd = editedForSave && (editedForSave as any).userDefined && typeof (editedForSave as any).userDefined === 'object'
        ? (editedForSave as any).userDefined
        : undefined;
      if (!hasUdThumb && editedForSaveUd && typeof editedForSaveUd.thumbnail !== 'undefined') {
        const candidateThumb = editedForSaveUd.thumbnail as any;
        // Build the images array that will be sent (prefer changes.userDefined.images)
        const outgoingImgs = Array.isArray(changes.userDefined?.images)
          ? (changes.userDefined as any).images
          : (Array.isArray(editedForSaveUd?.images) ? editedForSaveUd.images : []);

        let computed: string | undefined = undefined;
        const originalParsed = Array.isArray((original as any).images) ? (original as any).images : [];
        const originalTop = (original as any).thumbnail || '';

        if (typeof candidateThumb === 'string') {
          const s = candidateThumb;
          if (/^(user:|parsed:)/.test(s)) {
            computed = s;
          } else if (s.startsWith('data:')) {
            const uidx = outgoingImgs.findIndex((u: any) => getUserImageData(u) === s);
            if (uidx !== -1) computed = `user:${uidx}`;
            else if (originalTop && s === originalTop) computed = 'parsed:0';
            else if (originalParsed.includes(s)) computed = `parsed:${originalParsed.indexOf(s)}`;
          } else {
            const pidx = originalParsed.indexOf(s);
            if (pidx !== -1) computed = `parsed:${pidx}`;
            else if (s === originalTop) computed = 'parsed:0';
          }
        } else if (candidateThumb && typeof candidateThumb === 'object' && typeof (candidateThumb as any).data === 'string') {
          const data = (candidateThumb as any).data;
          const uidx = outgoingImgs.findIndex((u: any) => getUserImageData(u) === data);
          if (uidx !== -1) computed = `user:${uidx}`;
          else if (originalTop && data === originalTop) computed = 'parsed:0';
          else if (originalParsed.includes(data)) computed = `parsed:${originalParsed.indexOf(data)}`;
        }

        if (typeof computed !== 'undefined') {
          if (!changes.userDefined || typeof changes.userDefined !== 'object') changes.userDefined = {};
          (changes.userDefined as any).thumbnail = computed;
        }
      }
    } catch (e) {
      // Non-fatal: continue without forcing thumbnail
      console.warn('Failed to include edited nested thumbnail into changes (defensive):', e);
    }

    // Also ensure that a user-defined thumbnail (stored under userDefined.thumbnail)
    // is included in the changes payload if it exists or changed. The generic diff
    // above may not pick it up if only nested userDefined fields changed.
    if (editedUD && typeof editedUD === 'object') {
      const editedThumb = (editedUD as any).thumbnail;
      const origUD = (original as any).userDefined && typeof (original as any).userDefined === 'object' ? (original as any).userDefined : undefined;
      const origThumb = origUD ? (origUD as any).thumbnail : undefined;
      // Compare serialized forms to detect changes (handles string or object forms)
      const editedThumbStr = typeof editedThumb === 'undefined' ? undefined : JSON.stringify(editedThumb);
      const origThumbStr = typeof origThumb === 'undefined' ? undefined : JSON.stringify(origThumb);
      if (editedThumbStr !== origThumbStr) {
        if (!changes.userDefined || typeof changes.userDefined !== 'object') changes.userDefined = {};
        // Normalize outgoing thumbnail so we never send raw base64/data URLs
        // as userDefined.thumbnail. Prefer descriptor forms. If we cannot
        // safely convert the value to a descriptor, omit it so the server
        // preserves the original parsed thumbnail.
        const editedThumbAny = (editedUD as any).thumbnail;
        let safeThumb: string | undefined = undefined;
        const changeUDImgs = Array.isArray(changes.userDefined?.images) ? changes.userDefined.images : (Array.isArray(editedUD?.images) ? editedUD.images : []);
        const originalParsed = Array.isArray((original as any).images) ? (original as any).images : [];
        const originalTop = (original as any).thumbnail || '';

        if (typeof editedThumbAny === 'string') {
          const s = editedThumbAny;
          if (/^(user:|parsed:)/.test(s)) {
            safeThumb = s; // already a descriptor
          } else if (s.startsWith('data:')) {
            // try to find in outgoing user images
            const uidx = changeUDImgs.findIndex((u: any) => getUserImageData(u) === s);
            if (uidx !== -1) safeThumb = `user:${uidx}`;
            else if (originalTop && s === originalTop) safeThumb = 'parsed:0';
            else if (originalParsed.includes(s)) safeThumb = `parsed:${originalParsed.indexOf(s)}`;
            // otherwise leave undefined to avoid sending raw data
          } else {
            // non-data string - maybe matches a parsed image
            const pidx = originalParsed.indexOf(s);
            if (pidx !== -1) safeThumb = `parsed:${pidx}`;
            else if (s === originalTop) safeThumb = 'parsed:0';
            else {
              // Unknown string; do not send raw unknown values
            }
          }
        } else if (editedThumbAny && typeof editedThumbAny === 'object' && typeof (editedThumbAny as any).data === 'string') {
          const data = (editedThumbAny as any).data;
          const uidx = changeUDImgs.findIndex((u: any) => getUserImageData(u) === data);
          if (uidx !== -1) safeThumb = `user:${uidx}`;
          else if (originalTop && data === originalTop) safeThumb = 'parsed:0';
          else if (originalParsed.includes(data)) safeThumb = `parsed:${originalParsed.indexOf(data)}`;
        }

        if (typeof safeThumb !== 'undefined') {
          if (!changes.userDefined || typeof changes.userDefined !== 'object') changes.userDefined = {};
          changes.userDefined.thumbnail = safeThumb;
        } else {
          // omit thumbnail change to avoid sending base64; let server preserve parsed thumbnail
        }
      }
    }

    // Defensive: if editedForSave contains a nested thumbnail descriptor, ensure
    // it is included in the outgoing changes payload even if the generic diff
    // didn't detect any change (this can happen when only deeply-nested fields
    // were updated via local helpers like buildImageOrderFromModel).
    try {
      const ud0 = (editedForSave as any).userDefined && typeof (editedForSave as any).userDefined === 'object' ? (editedForSave as any).userDefined : undefined;
      // If there's an explicit imageOrder, prefer its first descriptor as the thumbnail
      if (ud0 && Array.isArray(ud0.imageOrder) && ud0.imageOrder.length > 0) {
        try {
          ud0.thumbnail = ud0.imageOrder[0];
        } catch (e) {
          // ignore
        }
      }
      if (ud0 && typeof ud0.thumbnail === 'string' && ud0.thumbnail.length > 0) {
        if (!changes.userDefined || typeof changes.userDefined !== 'object') changes.userDefined = {};
        // Do not overwrite an explicit thumbnail already present in changes.userDefined
        if (!(changes.userDefined && (changes.userDefined as any).thumbnail)) {
          changes.userDefined = { ...(changes.userDefined as any), thumbnail: ud0.thumbnail };
        }
      }
    } catch (e) {
      // Non-fatal: proceed without forcing thumbnail into changes
      console.warn('Failed to defensively include nested thumbnail into changes', e);
    }

    // Final enforcement: Make absolutely sure the outgoing `changes` payload
    // includes a nested thumbnail descriptor that matches the first item of
    // the edited model's `userDefined.imageOrder` (if present). This prevents
    // racey or-missed-diff cases where the thumbnail change could be omitted
    // and the server would keep the previous parsed:0 value.
    try {
      const editedUdFinal = (editedForSave as any).userDefined && typeof (editedForSave as any).userDefined === 'object'
        ? (editedForSave as any).userDefined
        : undefined;
      if (editedUdFinal && Array.isArray(editedUdFinal.imageOrder) && editedUdFinal.imageOrder.length > 0) {
        const firstDesc = editedUdFinal.imageOrder[0];
        if (typeof firstDesc === 'string' && firstDesc.length > 0) {
          if (!changes.userDefined || typeof changes.userDefined !== 'object') changes.userDefined = {};
          // Only overwrite if it's missing or different to avoid stomping other client intent
          if ((changes.userDefined as any).thumbnail !== firstDesc) {
            (changes.userDefined as any).thumbnail = firstDesc;
          }
        }
      }
    } catch (e) {
      // Non-fatal - continue with the best effort payload
      console.warn('Failed final enforcement of nested thumbnail into outgoing changes:', e);
    }

    // Note: clearing is represented by writing userDefined = [] above when the
    // user checks the "Restore original description" checkbox. We no longer
    // rely on a local flag here — the post-save refresh below always fetches
    // the authoritative model.

    try {
      // Log a compact preview of the outgoing payload for debugging (avoid dumping full base64 blobs)
      try {
        const preview = { filePath: editedForSave.filePath, changes: { ...changes } } as any;
        if (preview.changes && preview.changes.userDefined && typeof preview.changes.userDefined === 'object') {
          const ud0 = preview.changes.userDefined;
          if (ud0 && Array.isArray(ud0.images)) {
            preview.changes.userDefined = { ...ud0, images: `[${ud0.images.length} images]` } as any;
          }
        }
        console.debug('POST /api/save-model payload preview:', preview);
      } catch (e) {
        // Don't let logging break the save flow
        console.warn('Failed to produce save-model preview log', e);
      }
        // Extra debug: explicitly log the nested thumbnail descriptor if present so we can
        // verify whether the client is sending userDefined.thumbnail as expected.
      try {
        // Keep a single, sanitized console.debug preview for developers. This
        // avoids spamming visible console.log output while still making the
        // information available when debug logging is enabled.
        const udPreview = changes.userDefined && typeof changes.userDefined === 'object'
          ? { ...changes.userDefined, images: Array.isArray(changes.userDefined.images) ? `[${changes.userDefined.images.length} images]` : changes.userDefined.images }
          : undefined;
        const preview = { filePath: editedForSave.filePath, changes: { ...changes, userDefined: udPreview ? udPreview : undefined } };
        console.debug('POST /api/save-model payload preview (sanitized):', preview);
      } catch (e) {
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
      if (isSaving) return; // prevent double-submit
      setIsSaving(true);
      try {
      // If an inlineCombined edit ordering exists, finalize it into the
      // editedModel by splitting it into parsed top-level images and
      // userDefined images using the parsedImagesSnapshot captured at
      // edit-start. This keeps storage canonical while allowing arbitrary
      // UI ordering during editing.
      let modelToPersist = editedModel;
      if (inlineCombined) {
        const combined = inlineCombined.slice();
        const parsedSnapshotInline = parsedImagesSnapshotRef.current || [];
        
        // IMPORTANT: Don't reorder the actual data arrays - only update descriptors
        // Keep parsedImages in their original order
        const newParsedImages = parsedSnapshotInline.slice();
        
        // Keep userDefined.images in their original order
        const originalUserImages = (editedModel as any).userDefined && typeof (editedModel as any).userDefined === 'object' && Array.isArray((editedModel as any).userDefined.images)
          ? (editedModel as any).userDefined.images.slice()
          : [];

        const udObj = (editedModel as any).userDefined && typeof (editedModel as any).userDefined === 'object' ? { ...(editedModel as any).userDefined } : {};
        // Preserve original user images order - don't reorder based on combined array
        udObj.images = originalUserImages;

        // Build the new imageOrder based on the reordered combined array
        // This only affects the order descriptors, not the actual data
        const newImageOrder: string[] = [];
        for (const img of combined) {
          if (parsedSnapshotInline.includes(img)) {
            // This is a parsed image - find its index in the ORIGINAL parsed array
            const parsedIdx = parsedSnapshotInline.indexOf(img);
            newImageOrder.push(`parsed:${parsedIdx}`);
          } else {
            // This is a user image - find its index in the ORIGINAL user images array
            const userIdx = originalUserImages.findIndex((u: any) => getUserImageData(u) === img);
            if (userIdx !== -1) {
              newImageOrder.push(`user:${userIdx}`);
            }
          }
        }

        // Set the thumbnail descriptor to the first item in the new image order
  const firstDescriptor = newImageOrder[0];
  const copyUd0 = { ...(udObj as any) };
        if (firstDescriptor) {
          copyUd0.thumbnail = firstDescriptor;
        } else {
          // No images or empty order - clear thumbnail
          if (copyUd0.thumbnail) delete copyUd0.thumbnail;
        }
        
        // Update imageOrder to reflect the new ordering
  copyUd0.imageOrder = newImageOrder;
  // Create the final model with the updated structure
  modelToPersist = { ...editedModel, parsedImages: newParsedImages, userDefined: copyUd0 } as Model;
      } else {
        // No reordering happened - ensure modelToPersist has correct structure
        // The editedModel should already have parsedImages from startEditing, but ensure it's clean
        const cleanedModel = { ...editedModel };
        // Remove legacy images field if it exists
        if ('images' in cleanedModel) {
          delete (cleanedModel as any).images;
        }
        
        // Even without reordering, ensure thumbnail points to first imageOrder item
        const udObj = cleanedModel.userDefined && typeof cleanedModel.userDefined === 'object' ? { ...(cleanedModel.userDefined as any) } : {};
        const currentImageOrder = Array.isArray(udObj.imageOrder) ? udObj.imageOrder : [];
        const firstDescriptor = currentImageOrder[0];
        if (firstDescriptor && typeof firstDescriptor === 'string') {
          udObj.thumbnail = firstDescriptor;
          cleanedModel.userDefined = udObj;
        }
        
        modelToPersist = cleanedModel;
      }
      let finalModel = modelToPersist;
      // If any images are selected, remove them from the correct arrays (parsedImages vs userDefined.images)
      if (selectedImageIndexes.length > 0) {
        const sel = new Set(selectedImageIndexes);
        
        // Get current arrays using new structure
        const parsedImages = Array.isArray(finalModel.parsedImages) ? finalModel.parsedImages.slice() : [];
        const userImages = Array.isArray((finalModel as any).userDefined?.images)
          ? (finalModel as any).userDefined.images.slice()
          : [];
        
        // Get current imageOrder or build default
        const currentOrder = Array.isArray((finalModel as any).userDefined?.imageOrder)
          ? (finalModel as any).userDefined.imageOrder.slice()
          : buildImageOrderFromModel(finalModel);
        
        // Track which items to remove from each array
        const parsedToRemove = new Set<number>();
        const userToRemove = new Set<number>();
        const remainingOrder: string[] = [];
        
        // Process each descriptor in imageOrder to determine what to remove
        currentOrder.forEach((desc: string, orderIndex: number) => {
          if (sel.has(orderIndex)) {
            // This image is selected for deletion
            if (typeof desc === 'string' && desc.startsWith('parsed:')) {
              const parsedIndex = parseInt(desc.split(':')[1] || '', 10);
              if (!isNaN(parsedIndex)) {
                parsedToRemove.add(parsedIndex);
              }
            } else if (typeof desc === 'string' && desc.startsWith('user:')) {
              const userIndex = parseInt(desc.split(':')[1] || '', 10);
              if (!isNaN(userIndex)) {
                userToRemove.add(userIndex);
              }
            }
          } else {
            // Keep this descriptor, but may need to adjust indices
            remainingOrder.push(desc);
          }
        });
        
        // Remove from parsedImages (create new array with items removed)
        const newParsedImages = parsedImages.filter((_: any, index: number) => !parsedToRemove.has(index));
              
        // Remove from userDefined.images (create new array with items removed)  
        const newUserImages = userImages.filter((_: any, index: number) => !userToRemove.has(index));
        
        // Rebuild imageOrder with corrected indices
        const adjustedOrder: string[] = [];
        let parsedShift = 0;
        let userShift = 0;
        
        remainingOrder.forEach(desc => {
          if (typeof desc === 'string' && desc.startsWith('parsed:')) {
            const oldIndex = parseInt(desc.split(':')[1] || '', 10);
            if (!isNaN(oldIndex)) {
              // Count how many parsed images with lower indices were removed
              parsedShift = Array.from(parsedToRemove).filter(removedIdx => removedIdx < oldIndex).length;
              const newIndex = oldIndex - parsedShift;
              if (newIndex >= 0 && newIndex < newParsedImages.length) {
                adjustedOrder.push(`parsed:${newIndex}`);
              }
            }
          } else if (typeof desc === 'string' && desc.startsWith('user:')) {
            const oldIndex = parseInt(desc.split(':')[1] || '', 10);
            if (!isNaN(oldIndex)) {
              // Count how many user images with lower indices were removed
              userShift = Array.from(userToRemove).filter(removedIdx => removedIdx < oldIndex).length;
              const newIndex = oldIndex - userShift;
              if (newIndex >= 0 && newIndex < newUserImages.length) {
                adjustedOrder.push(`user:${newIndex}`);
              }
            }
          } else {
            // Keep non-descriptor entries as-is (for backward compatibility)
            adjustedOrder.push(desc);
          }
        });
        
        // Update finalModel with new arrays and order using object-shaped userDefined
        const finalUdObj = finalModel.userDefined && typeof finalModel.userDefined === 'object' ? { ...(finalModel.userDefined as any) } : {};
        finalUdObj.images = newUserImages;
        finalUdObj.imageOrder = adjustedOrder;
        // Update thumbnail descriptor if needed
        if (adjustedOrder.length > 0) {
          finalUdObj.thumbnail = adjustedOrder[0]; // First image becomes thumbnail
        } else {
          // No images left, clear thumbnail
          delete finalUdObj.thumbnail;
        }
        finalModel = {
          ...finalModel,
          parsedImages: newParsedImages,
          userDefined: finalUdObj
        } as Model;
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

      // Ensure nested thumbnail is set to the first imageOrder descriptor
      // so it will be picked up by the diff and included in the save payload.
      try {
        const udObj = finalModel.userDefined && typeof finalModel.userDefined === 'object' ? { ...(finalModel.userDefined as any) } : undefined;
        const order = udObj && Array.isArray(udObj.imageOrder) ? udObj.imageOrder : undefined;
        if (order && order.length > 0 && typeof order[0] === 'string') {
          // Set nested thumbnail to the first descriptor (parsed:N or user:N)
          udObj.thumbnail = order[0];
          finalModel = { ...finalModel, userDefined: udObj } as Model;
        }
      } catch (e) {
        console.warn('Failed to ensure nested thumbnail before save:', e);
      }

      // If an imageOrder exists on the model (or was constructed while editing),
      // ensure we persist canonical parsed images only into top-level `images`.
      // Use the parsedImagesSnapshot captured when editing began as the
      // authoritative parsed-image list so user base64 data never gets promoted.
      try {
        // Read imageOrder from userDefined.imageOrder (canonical place)
        const imageOrder: string[] | undefined = Array.isArray((finalModel as any).userDefined?.imageOrder)
          ? (finalModel as any).userDefined.imageOrder
          : undefined;
        if (Array.isArray(imageOrder) && imageOrder.length > 0) {
          const parsedSnapshot = parsedImagesSnapshotRef.current || [];
          const finalParsed: string[] = [];
          let resolvedThumbnail = finalModel.thumbnail || '';
          for (const desc of imageOrder) {
            if (typeof desc !== 'string') continue;
            if (desc.startsWith('parsed:')) {
              const idx = parseInt(desc.split(':')[1] || '', 10);
              if (!isNaN(idx) && parsedSnapshot[idx]) finalParsed.push(parsedSnapshot[idx]);
            } else if (desc.startsWith('user:')) {
              // skip - user images belong in userDefined only
            } else {
              // fallback: try to match in parsedSnapshot
              const pidx = parsedSnapshot.indexOf(desc);
              if (pidx !== -1) finalParsed.push(parsedSnapshot[pidx]);
            }
          }
          finalModel = { ...finalModel, images: finalParsed, thumbnail: resolvedThumbnail } as Model;
        } else {
          // No imageOrder: legacy behavior keeps existing images as-is
        }
      } catch (e) {
        console.warn('Failed to normalize images from imageOrder before save:', e);
      }

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
        setSelectedImageIndexes([]);
        setInlineCombined(null);
      } else {
        // Save failed (network/server error). Keep editedModel so user can retry.
        // Optionally display error (saveModelToFile already logs).
        return;
      }
      } finally {
        setIsSaving(false);
      }
    }
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

  // Set an image as the main thumbnail
  const handleSetAsMain = (imageIndex: number) => {
    if (!isEditing || !editedModel) return;
    
    // Get current imageOrder or build it
    const currentOrder = Array.isArray((editedModel as any).userDefined?.imageOrder)
      ? (editedModel as any).userDefined.imageOrder.slice()
      : buildImageOrderFromModel(editedModel);
    
    if (imageIndex < 0 || imageIndex >= currentOrder.length) return;
    
    const selectedDescriptor = currentOrder[imageIndex];
    
    // Update the model to set this image as the thumbnail
    setEditedModel(prev => {
      if (!prev) return prev;
      
      const udObj = prev.userDefined && typeof prev.userDefined === 'object' ? { ...(prev.userDefined as any) } : {};
      // Set the thumbnail descriptor
      udObj.thumbnail = selectedDescriptor;
      // Move this descriptor to the front of imageOrder so it appears first
      const newOrder = [selectedDescriptor, ...currentOrder.filter((_: any, idx: number) => idx !== imageIndex)];
      udObj.imageOrder = newOrder;
      return { ...prev, userDefined: udObj } as Model;
    });
    
    // Update inlineCombined to reflect new order
    if (inlineCombined) {
      const selectedImage = inlineCombined[imageIndex];
      const newOrder = [selectedImage, ...inlineCombined.filter((_, idx) => idx !== imageIndex)];
      setInlineCombined(newOrder);
    }
    
    // Set the preview to show the new main image
    setSelectedImageIndex(0);
  };


  // Download handler for model file
  const handleDownloadClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Determine default extension based on modelUrl if available
    // Determine default extension based on modelUrl if available
    const defaultExtension = currentModel!.modelUrl?.toLowerCase().endsWith('.stl') ? '.stl' : '.3mf';

    // If a filePath (JSON path) is present, prefer using it to derive the
    // model file location. `filePath` may include subdirectories (e.g.
    // "subdir/model-stl-munchie.json") so derive the original model file
    // name by replacing the -munchie.json suffix with the original extension
    // when possible. Otherwise fall back to modelUrl which may already be a
    // full "/models/.." URL.
    let outFilePath: string | undefined;

    if (currentModel!.filePath) {
      // filePath is typically the JSON file on disk; try to map it back to
      // the model file name. Preserve any subdirectory present in filePath.
      const fp = currentModel!.filePath.replace(/^\/*/, ''); // remove leading slash
      // If the filePath ends with -munchie.json or -stl-munchie.json, strip
      // that suffix and try to append the likely extension.
      let base = fp;
      base = base.replace(/-stl-munchie\.json$/i, '');
      base = base.replace(/-munchie\.json$/i, '');

      // If the remaining base already has a known model extension, use it;
      // otherwise default to modelUrl's extension or .3mf
      const hasExt = /\.(stl|3mf)$/i.test(base);
      let finalName = base;
      if (!hasExt) {
        // Try to infer from modelUrl
        if (currentModel!.modelUrl && /\.stl$/i.test(currentModel!.modelUrl)) finalName = `${base}.stl`;
        else finalName = `${base}.3mf`;
      }

      // Prepend /models/ so triggerDownload receives a path consistent with
      // other callers that expect model files under /models/.
      outFilePath = `/models/${finalName}`;
    } else if (currentModel!.modelUrl) {
      // modelUrl often already contains `/models/...` so use it as-is.
      outFilePath = currentModel!.modelUrl;
    } else {
      // Fallback: construct a filename from the model name
      const name = currentModel!.name || 'model';
      outFilePath = `/models/${name}${defaultExtension}`;
    }

    // Use shared triggerDownload to normalize and trigger the download
    // Compute a safe download filename (basename only) so the browser doesn't
    // include any directory prefix in the saved file name.
  const safeBaseName = outFilePath ? outFilePath.replace(/^\/+/, '').replace(/\\/g, '/').split('/').pop() || '' : '';

    // Normalize backslashes in the outgoing path so HEAD and downloads are consistent
    const normalizedOut = outFilePath ? outFilePath.replace(/\\/g, '/') : outFilePath;
    // Trigger the download using the normalized path and explicit basename.
    // Path normalization ensures we don't leak Windows backslashes into the
    // suggested download filename.
    triggerDownload(normalizedOut, e.nativeEvent as any as MouseEvent, safeBaseName);
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
    if (!open && isEditing) {
      // Ignore outside-close attempts while editing to prevent losing unsaved work
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
    nozzle: currentModel.printSettings?.nozzle || '',
    printer: (currentModel.printSettings as any)?.printer || ''
  };

  // Determine if the underlying model is STL or 3MF using filePath/modelUrl
  const isStlModel = (() => {
    try {
      const p = (currentModel.filePath || currentModel.modelUrl || '').toLowerCase();
      return p.endsWith('.stl') || p.endsWith('-stl-munchie.json');
    } catch (_) { return false; }
  })();

  return (
    <Sheet open={isOpen} onOpenChange={handleSheetOpenChange}>
      <SheetContent
        className="w-full sm:max-w-2xl"
        onEscapeKeyDown={handleContentEscapeKeyDown}
        // Allow outside clicks to close unless we're editing or in fullscreen image mode
        blockOverlayInteractions={isWindowFullscreen}
        onInteractOutside={(event) => {
          if (!(isEditing || isWindowFullscreen)) return;
          const originalEvent = (event as any)?.detail?.originalEvent as Event | undefined;
          const target = (originalEvent?.target as HTMLElement) || (event.target as HTMLElement | null);
          // Allow interactions with nested popovers/selects to proceed so their close-on-outside still works
          if (target && target.closest('[data-slot="select-content"]')) {
            return;
          }
          if (isWindowFullscreenRef.current) {
            isWindowFullscreenRef.current = false;
            setIsWindowFullscreen(false);
          }
          event.preventDefault();
        }}
      >
        {/* Sticky Header during editing */}
        <SheetHeader className={`space-y-4 pb-6 border-b border-border bg-background/95 backdrop-blur-sm ${isEditing ? 'sticky top-0 z-10 shadow-sm' : ''}`}> 
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1 min-w-0">
              <SheetTitle className="text-xl font-semibold text-card-foreground pr-2 truncate block">
                <span className="block w-full truncate">{currentModel.name}</span>
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
                  <Button onClick={saveChanges} size="sm" className="gap-2" disabled={invalidRelated.length > 0 || isSaving} title={invalidRelated.length > 0 ? 'Cannot save: fix invalid related files' : undefined}>
                    {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button onClick={cancelEditing} variant="outline" size="sm" disabled={isSaving}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={startEditing} variant="outline" size="sm" className="gap-2">
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </Button>
                </>
              )}
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0" viewportRef={detailsViewportRef}>
          <div className="p-4 space-y-8">
          {/* Model file path / URL (readonly, download) - moved above preview */}
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Label className="whitespace-nowrap text-muted-foreground">Path</Label>
              <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto] items-center gap-2">
                {/* Scrollable path in the first column (flexible) */}
                <div className="min-w-0 relative">
                  <ScrollArea className="h-8 w-full min-w-0" showHorizontalScrollbar={true} showVerticalScrollbar={false}>
                    <div className="px-2 py-1 text-sm whitespace-nowrap select-text inline-block min-w-max">
                      {displayModelPath}
                    </div>
                  </ScrollArea>
                  {/* Subtle fade at right edge to indicate more content */}
                  <div className="absolute top-0 right-0 h-8 w-8 pointer-events-none bg-gradient-to-l from-background/80 to-transparent" aria-hidden />
                </div>
                {/* Button in the auto-width column so it never gets pushed offscreen */}
                <div className="shrink-0">
                  <Button onClick={handleDownloadClick} size="sm" variant="default" className="gap-2" title="Download model file">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
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
                      onCapture={handleCapturedImage}
                      customColor={defaultModelColor || undefined}
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
                          <ImageWithFallback src={allImages[selectedImageIndex]} alt={`${currentModel.name} - Image ${selectedImageIndex + 1}`} className="relative max-w-full h-screen object-contain rounded-lg" />

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
                            <div
                              key={index}
                              data-thumb-index={index}
                              role="button"
                              tabIndex={0}
                              draggable={isEditing && !isWindowFullscreen}
                              onDragStart={(e) => handleDragStart(e as any, index)}
                              onDragOver={(e) => handleDragOver(e as any, index)}
                              onDrop={(e) => handleDrop(e as any, index)}
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
                              onKeyDown={(e: React.KeyboardEvent) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  (e.target as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
                                }
                              }}
                              className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${isImageSelected(index) ? 'opacity-60 ring-2 ring-destructive scale-95' : index === selectedImageIndex ? 'border-primary shadow-lg scale-105' : 'border-border hover:border-primary/50 hover:scale-102'} ${dragOverIndex === index ? 'ring-2 ring-primary/60' : ''}`}
                            >
                              <ImageWithFallback src={image} alt={`${currentModel.name} thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                              {isImageSelected(index) && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-semibold z-10">
                                  Remove
                                </div>
                              )}
                              {index === 0 && (
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                  <Badge variant="secondary" className="text-xs px-1 py-0">Main</Badge>
                                </div>
                              )}
                              {/* Set as Main button for non-main images in edit mode (currently: hidden)*/}
                              {isEditing && index !== 0 && !isImageSelected(index) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSetAsMain(index);
                                  }}
                                  className="absolute top-1 right-1 bg-black/70 hover:bg-black/90 text-white text-xs px-1 py-0.5 rounded transition-colors z-10 hidden"
                                  title="Set as main thumbnail"
                                >
                                  Set Main
                                </button>
                              )}
                            </div>
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

          {/* Collection actions placed below the model preview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            <Button
              onClick={() => setIsAddToCollectionOpen(true)}
              variant="outline"
              size="sm"
              className="justify-start gap-2 w-full"
              title="Add this model to an existing collection"
              aria-label="Add current to collection"
              disabled={!collections || collections.length === 0}
            >
              <List className="h-4 w-4" />
              Add to Collection
            </Button>
            <Button
              onClick={() => setIsRemoveFromCollectionOpen(true)}
              variant="outline"
              size="sm"
              className="justify-start gap-2 w-full"
              title="Remove this model from a collection"
              aria-label="Remove current from collection"
              disabled={!collections.some(c => Array.isArray(c.modelIds) && c.modelIds.includes(currentModel.id))}
            >
              <MinusCircle className="h-4 w-4" />
              Remove from Collection
            </Button>
          </div>

          {/* Print Settings */}
          <div className="space-y-4 mb-4">
            <h3 className="font-semibold text-lg text-card-foreground">Print Settings</h3>
            {safePrintSettings.printer ? (
              <p className="text-sm text-muted-foreground">
                Printer: <span className="font-medium text-foreground">{safePrintSettings.printer}</span>
              </p>
            ) : null}
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
                {/* Print settings (editable only for STL models) */}
                {isStlModel && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-layer-height">Layer height (mm)</Label>
                        <Input
                          id="edit-layer-height"
                          value={(editedModel as any)?.printSettings?.layerHeight || ''}
                          onChange={(e) => setEditedModel(prev => {
                            if (!prev) return prev;
                            const ps = { ...(prev.printSettings || {}) } as any;
                            ps.layerHeight = e.target.value;
                            return { ...prev, printSettings: ps } as Model;
                          })}
                          placeholder="e.g. 0.2"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-infill">Infill (%)</Label>
                        <Input
                          id="edit-infill"
                          value={(editedModel as any)?.printSettings?.infill || ''}
                          onChange={(e) => setEditedModel(prev => {
                            if (!prev) return prev;
                            const ps = { ...(prev.printSettings || {}) } as any;
                            ps.infill = e.target.value;
                            return { ...prev, printSettings: ps } as Model;
                          })}
                          placeholder="e.g. 20%"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-nozzle">Nozzle (mm)</Label>
                        <Input
                          id="edit-nozzle"
                          value={(editedModel as any)?.printSettings?.nozzle || ''}
                          onChange={(e) => setEditedModel(prev => {
                            if (!prev) return prev;
                            const ps = { ...(prev.printSettings || {}) } as any;
                            ps.nozzle = e.target.value;
                            return { ...prev, printSettings: ps } as Model;
                          })}
                          placeholder="e.g. 0.4"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-printer">Printer</Label>
                        <Input
                          id="edit-printer"
                          value={(editedModel as any)?.printSettings?.printer || ''}
                          onChange={(e) => setEditedModel(prev => {
                            if (!prev) return prev;
                            const ps = { ...(prev.printSettings || {}) } as any;
                            ps.printer = e.target.value;
                            return { ...prev, printSettings: ps } as Model;
                          })}
                          placeholder="e.g. Bambu P1S"
                        />
                      </div>
                    </div>
                  </>
                )}
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
                                  // Remove only the nested userDefined.description while
                                  // preserving any userDefined.images so the save can
                                  // clear the description but keep images.
                                  const copy = { ...prev } as any;
                                  const ud = copy.userDefined && typeof copy.userDefined === 'object' ? { ...copy.userDefined } : {};
                                  // Delete the description key so save logic knows to clear it
                                  if (Object.prototype.hasOwnProperty.call(ud, 'description')) delete ud.description;
                                  copy.userDefined = ud;
                                  // Show the original top-level description in the edit buffer
                                  copy.description = originalTopLevelDescriptionRef.current || '';
                                  return copy as Model;
                                } else {
                                  // Restore the previous userDefined description into the edit buffer
                                  const copy = { ...prev } as any;
                                  if (originalUserDefinedDescriptionRef.current !== null) {
                                    copy.userDefined = { description: originalUserDefinedDescriptionRef.current };
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
                  
                  {/* Tags editor */}
                  <TagsInput
                    value={editedModel?.tags || []}
                    onChange={(next) => {
                      if (!editedModel) return;
                      setEditedModel({ ...editedModel, tags: next });
                    }}
                  />

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

                  {/* Current tags are shown within TagsInput; retain suggested below */}
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
                          {/* View button: only visible when verification succeeded */}
                          {(!isEditing && relatedVerifyStatus[idx]?.ok) ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={relatedVerifyStatus[idx]?.loading}
                              onClick={async (e) => {
                                e.stopPropagation();
                                let candidate = rf;
                                try {
                                  if (candidate.endsWith('.3mf')) {
                                    candidate = candidate.replace(/\.3mf$/i, '-munchie.json');
                                  } else if (/\.stl$/i.test(candidate)) {
                                    candidate = candidate.replace(/\.stl$/i, '-stl-munchie.json');
                                  }
                                  if (candidate.startsWith('/models/')) candidate = candidate.replace(/^\/models\//, '');

                                  const url = `/models/${candidate}`;
                                  const resp = await fetch(url, { cache: 'no-store' });
                                  if (!resp.ok) {
                                    try { toast?.error && toast.error('Related munchie JSON not found'); } catch (e) {}
                                    return;
                                  }
                                  const parsed = await resp.json();
                                  try {
                                    if (typeof onModelUpdate === 'function') onModelUpdate(parsed as Model);
                                  } catch (e) {
                                    console.warn('onModelUpdate failed when loading related model', e);
                                  }
                                } catch (err) {
                                  try { toast?.error && toast.error('Failed to load related model'); } catch (e) {}
                                  console.error('Failed to load related model', err);
                                }
                              }}
                            >
                              View
                            </Button>
                          ) : null}
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
                  <Button onClick={cancelEditing} variant="outline" className="gap-2" disabled={isSaving}>
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button onClick={saveChanges} className="gap-2" disabled={invalidRelated.length > 0 || isSaving} title={invalidRelated.length > 0 ? 'Cannot save: fix invalid related files' : undefined}>
                    {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-muted-foreground text-base leading-relaxed">
                  {(() => {
                      // Prefer userDefined.description when available.
                      try {
                        const ud = (currentModel as any).userDefined;
                        // If userDefined.description is present and non-empty (after trim)
                        // treat it as an override. If it's an empty string, fall back
                        // to the top-level description.
                        if (ud && typeof ud === 'object' && typeof ud.description === 'string') {
                          if (ud.description.trim() !== '') return ud.description;
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
                        {availableRelatedMunchie[idx] ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                let candidate = deriveMunchieCandidate(path);
                                if (!candidate) {
                                  try { toast?.error && toast.error('This file type cannot be viewed'); } catch (e) {}
                                  return;
                                }
                                const url = `/models/${candidate}`;
                                const resp = await fetch(url, { cache: 'no-store' });
                                if (!resp.ok) {
                                  try { toast?.error && toast.error('Related munchie JSON not found'); } catch (e) {}
                                  return;
                                }
                                const parsed = await resp.json();
                                try { onModelUpdate(parsed as Model); } catch (e) { console.warn('onModelUpdate failed', e); }
                                // scroll the drawer content back to top so the newly-loaded model is visible
                                try { detailsViewportRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { /* ignore */ }
                              } catch (err) {
                                try { toast?.error && toast.error('Failed to load related model'); } catch (e) {}
                                console.error('Failed to load related model', err);
                              }
                            }}
                          >
                            View
                          </Button>
                        ) : null}
                        <Button size="sm" onClick={async (e) => {
                          e.stopPropagation();
                          // Use shared triggerDownload which will normalize the path and trigger the browser download
                          const safeName = path ? path.replace(/^\/+/, '').split('/').pop() || '' : '';
                          const normalizedPath = path ? path.replace(/\\/g, '/') : path;
                          // Trigger download for related file (normalized path, explicit basename)
                          triggerDownload(normalizedPath, e.nativeEvent as any as MouseEvent, safeName);
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

          {/* G-code Data Section (view mode only) */}
          {!isEditing && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Codesandbox className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold text-lg text-card-foreground">G-code Analysis</h3>
                </div>
                
                {/* Hidden file input */}
                <input
                  ref={gcodeInputRef}
                  type="file"
                  accept=".gcode,.3mf"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleGcodeUpload(file);
                      e.target.value = '';
                    }
                  }}
                />
                
                {currentModel.gcodeData ? (
                  <>
                    {/* Upload and Re-analyze buttons (when data exists) */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => gcodeInputRef.current?.click()}
                        disabled={isUploadingGcode}
                        className="gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        {isUploadingGcode ? 'Uploading...' : 'Upload New G-code'}
                      </Button>
                      {currentModel.gcodeData.gcodeFilePath && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleReanalyzeGcode}
                          disabled={isUploadingGcode}
                          className="gap-2"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Re-analyze
                        </Button>
                      )}
                    </div>

                    {/* Summary display */}
                    <Collapsible open={isGcodeExpanded} onOpenChange={setIsGcodeExpanded}>
                      <div className="p-4 bg-muted/30 rounded-lg border">
                        <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{currentModel.gcodeData.printTime || 'N/A'}</span>
                            </div>
                            <div className="text-muted-foreground">|</div>
                            <div className="flex items-center gap-2">
                              <Weight className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{currentModel.gcodeData.totalFilamentWeight || 'N/A'}</span>
                            </div>
                          </div>
                          {currentModel.gcodeData.filaments.length > 1 && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <span>{currentModel.gcodeData.filaments.length} filaments</span>
                              {isGcodeExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                          )}
                        </CollapsibleTrigger>

                        {/* Multi-filament details table */}
                        {currentModel.gcodeData.filaments.length > 1 && (
                          <CollapsibleContent className="mt-4">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2 px-2">Color</th>
                                  <th className="text-left py-2 px-2">Type</th>
                                  <th className="text-right py-2 px-2">Length</th>
                                  <th className="text-right py-2 px-2">Weight</th>
                                </tr>
                              </thead>
                              <tbody>
                                {currentModel.gcodeData.filaments.map((filament, idx) => (
                                  <tr key={idx} className="border-b last:border-0">
                                    <td className="py-2 px-2">
                                      <div
                                        className="w-6 h-6 rounded border"
                                        style={{ backgroundColor: filament.color || '#888' }}
                                        title={filament.color || 'No color data'}
                                      />
                                    </td>
                                    <td className="py-2 px-2">{filament.type}</td>
                                    <td className="text-right py-2 px-2">{filament.length}</td>
                                    <td className="text-right py-2 px-2">{filament.weight}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </CollapsibleContent>
                        )}
                      </div>
                    </Collapsible>
                  </>
                ) : (
                  <>
                    {/* Prominent drag-and-drop zone when no data exists */}
                    <div
                      className="border-2 border-dashed border-primary/50 rounded-lg p-8 text-center hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
                      onDragOver={handleGcodeDragOver}
                      onDrop={handleGcodeDrop}
                      onClick={() => gcodeInputRef.current?.click()}
                    >
                      <Upload className="h-12 w-12 mx-auto mb-3 text-primary" />
                      <p className="text-base font-medium mb-2">Upload G-code File</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Drag and drop a .gcode or .gcode.3mf file here
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isUploadingGcode}
                        className="gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          gcodeInputRef.current?.click();
                        }}
                      >
                        <Upload className="h-4 w-4" />
                        {isUploadingGcode ? 'Uploading...' : 'Browse Files'}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Analyze print time, filament usage, and multi-color information from your sliced G-code
                    </p>
                  </>
                )}
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

        {/* Add to existing collection modal */}
        {isAddToCollectionOpen && currentModel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsAddToCollectionOpen(false)}>
            <div className="bg-card border rounded shadow-lg w-full max-w-sm p-4" onClick={(e) => e.stopPropagation()}>
              <div className="font-semibold mb-3">Add to collection</div>
              <div className="space-y-2">
                <Select value={addTargetCollectionId || ''} onValueChange={(val) => setAddTargetCollectionId(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a collection" />
                  </SelectTrigger>
                  <SelectContent>
                    {(collections || []).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsAddToCollectionOpen(false)}>Cancel</Button>
                  <Button
                    size="sm"
                    disabled={!addTargetCollectionId}
                    onClick={async () => {
                      try {
                        const col = (collections || []).find(c => c.id === addTargetCollectionId);
                        if (!col) return;
                        const nextIds = Array.from(new Set([...(col.modelIds || []), currentModel.id]));
                        const resp = await fetch('/api/collections', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: col.id, name: col.name, description: col.description || '', modelIds: nextIds, category: (col as any).category || '', tags: (col as any).tags || [], images: (col as any).images || [], coverModelId: (col as any).coverModelId })
                        });
                        if (resp.ok) {
                          setIsAddToCollectionOpen(false);
                          setAddTargetCollectionId(null);
                          toast.success('Added to collection');
                          // Optionally refresh collections/models for latest hidden flag
                          try { await fetch('/api/collections', { cache: 'no-store' }); } catch {}
                        } else {
                          toast.error('Failed to add to collection');
                        }
                      } catch {
                        toast.error('Failed to add to collection');
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Remove from collection modal */}
        {isRemoveFromCollectionOpen && currentModel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsRemoveFromCollectionOpen(false)}>
            <div className="bg-card border rounded shadow-lg w-full max-w-sm p-4" onClick={(e) => e.stopPropagation()}>
              <div className="font-semibold mb-3">Remove from collection</div>
              <div className="space-y-2">
                <Select value={removeTargetCollectionId || ''} onValueChange={(val) => setRemoveTargetCollectionId(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a collection" />
                  </SelectTrigger>
                  <SelectContent>
                    {(collections || []).filter(c => Array.isArray(c.modelIds) && c.modelIds.includes(currentModel.id)).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsRemoveFromCollectionOpen(false)}>Cancel</Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={!removeTargetCollectionId}
                    onClick={async () => {
                      try {
                        const col = (collections || []).find(c => c.id === removeTargetCollectionId);
                        if (!col) return;
                        const nextIds = (col.modelIds || []).filter((id: string) => id !== currentModel.id);
                        const resp = await fetch('/api/collections', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: col.id, name: col.name, description: col.description || '', modelIds: nextIds, category: (col as any).category || '', tags: (col as any).tags || [], images: (col as any).images || [], coverModelId: (col as any).coverModelId })
                        });
                        if (resp.ok) {
                          setIsRemoveFromCollectionOpen(false);
                          setRemoveTargetCollectionId(null);
                          toast.success('Removed from collection');
                          try { window.dispatchEvent(new CustomEvent('collection-updated', { detail: { id: col.id } })); } catch {}
                        } else {
                          toast.error('Failed to remove from collection');
                        }
                      } catch {
                        toast.error('Failed to remove from collection');
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* G-code overwrite confirmation dialog */}
        <AlertDialog open={gcodeOverwriteDialog.open} onOpenChange={(open) => !open && setGcodeOverwriteDialog({ open: false, file: null, existingPath: '' })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>G-code file already exists</AlertDialogTitle>
              <AlertDialogDescription>
                A G-code file already exists at: <strong>{gcodeOverwriteDialog.existingPath}</strong>
                <br /><br />
                Do you want to overwrite it with the new file?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setGcodeOverwriteDialog({ open: false, file: null, existingPath: '' })}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                if (gcodeOverwriteDialog.file) {
                  handleGcodeUpload(gcodeOverwriteDialog.file, true);
                }
                setGcodeOverwriteDialog({ open: false, file: null, existingPath: '' });
              }}>
                Overwrite
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}