import { useRef, useState, Suspense, memo, useMemo, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import '@react-three/fiber';
import { Button } from "./ui/button";
import { Eye, EyeOff, RotateCw, Palette, ImagePlus } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { Skeleton } from "./ui/skeleton";
import { ThreeJSManager, disposeWebGLContext } from "../utils/threeJSManager";
import { SharedModelScene } from "./SharedModelScene";

interface ModelViewer3DProps {
  modelUrl?: string;
  modelName?: string;
  // callback invoked with a PNG data URL of the current canvas render
  onCapture?: (dataUrl: string) => void;
  // optional external default/custom color to apply to models
  customColor?: string;
  // programmatic trigger: change this number to force the viewer to capture and call onCapture
  captureTrigger?: number;
  // Called when the model has finished loading and we have a valid bounding box
  onModelLoaded?: () => void;
}



// Use shared scene setup for consistency
const Scene = memo(({ modelUrl, autoRotate, materialType, customColor, onModelLoaded }: { modelUrl?: string; autoRotate?: boolean; materialType?: 'standard' | 'normal'; customColor?: string; onModelLoaded?: () => void }) => {
  return (
    <SharedModelScene
      modelUrl={modelUrl}
      customColor={customColor}
      autoRotate={autoRotate}
      materialType={materialType}
      onModelLoaded={onModelLoaded}
    />
  );
});

Scene.displayName = "Scene";


export const ModelViewer3D = memo(({ modelUrl, modelName = "3D Model", onCapture, customColor: externalCustomColor, onModelLoaded }: ModelViewer3DProps) => {
  const [isWireframe, setIsWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [materialType, setMaterialType] = useState<'standard' | 'normal'>('standard');
  const [customColor, setCustomColor] = useState<string | undefined>(externalCustomColor);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [isDestroyed, setIsDestroyed] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const instanceId = useRef(`viewer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(true);

  // Capture trigger counter - when this prop increments, perform a capture
  // (kept local in case parent doesn't pass it); handled via props in signature
  // NOTE: captureTrigger prop is optional and if provided, will cause an automatic
  // capture when its value changes.
  // The actual prop value is read via arguments above (captureTrigger) via props.

  const is3MF = modelUrl?.toLowerCase().endsWith('.3mf');

  // Reset states when component unmounts or model changes
  useEffect(() => {
    setIsWireframe(false);
    setIsDestroyed(false);
  }, [modelName]);

  // Sync external custom color prop into internal state when it changes
  useEffect(() => {
    if (externalCustomColor) {
      setCustomColor(externalCustomColor);
    }
  }, [externalCustomColor]);

  // Global Canvas instance management - prevent multiple Three.js instances.
  // Instead of failing immediately when another instance is active, retry
  // registration for a short period. This makes visible-capture flows (like
  // the generation dialog) more resilient when another viewer is briefly active.
  useEffect(() => {
    const currentInstanceId = instanceId.current;
    let isMounted = true;
    let registered = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const MAX_ATTEMPTS = 25; // ~25 * 200ms = 5s
    const INTERVAL_MS = 200;
    let attempts = 0;

    const tryRegister = () => {
      if (!isMounted) return;
      if (!isMounted) return;
      setIsRegistering(true);
      attempts += 1;
      const ok = ThreeJSManager.register(currentInstanceId);
      if (ok) {
        registered = true;
        if (!isMounted) return;
        setIsRegistered(true);
        setIsRegistering(false);
        // Small delay to prevent rendering conflicts
        setTimeout(() => {
          if (ThreeJSManager.isActive(currentInstanceId) && !isDestroyed) {
            setCanvasReady(true);
          }
        }, 100);

        // nothing more to schedule; cleanup will unregister
        return;
      }

      // If not registered and we've not exhausted attempts, try again later
      if (attempts < MAX_ATTEMPTS) {
        retryTimer = setTimeout(tryRegister, INTERVAL_MS);
      } else {
        console.warn('Could not register 3D viewer instance - another viewer is active (after retries)');
        if (isMounted) {
          setIsRegistered(false);
          setIsRegistering(false);
          setIsDestroyed(true);
        }
      }
    };

    // Start trying to register
    tryRegister();

    return () => {
      isMounted = false;
      if (retryTimer) clearTimeout(retryTimer);
      if (registered) {
        try {
          ThreeJSManager.unregister(currentInstanceId);
        } catch (e) {
          // ignore
        }
      }
      setIsDestroyed(true);
      setCanvasReady(false);
      try {
        if (canvasRef.current) disposeWebGLContext(canvasRef.current);
      } catch (e) {
        // ignore
      }
    };
  }, []);

  // Memoize canvas configuration to prevent recreation
  const canvasConfig = useMemo(() => ({
    shadows: true,
    gl: { 
      antialias: true, 
      alpha: true, 
      // set to true to allow capturing the canvas via toDataURL()
      preserveDrawingBuffer: true,
      powerPreference: "high-performance" as const,
      stencil: false, // Reduce memory usage
      depth: true,
    },
    style: { background: 'transparent' },
    dpr: Math.min(window.devicePixelRatio, 2), // Cap DPR to prevent performance issues
    frameloop: "demand" as const, // Only render when needed
  }), []);

  // Don't render if component is being destroyed, not ready, or not registered
  if (isDestroyed || !canvasReady || !isRegistered) {
    return (
      <div className="relative">
        <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg overflow-hidden border border-border">
          <div className="w-full h-full flex items-center justify-center">
            {isRegistering ? (
              <div className="text-center space-y-2">
                <p className="text-sm font-medium">Waiting for 3D renderer...</p>
                <p className="text-xs text-muted-foreground">Another 3D viewer is releasing the renderer. This may take a few seconds.</p>
              </div>
            ) : !isRegistered ? (
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">3D Viewer Unavailable</p>
                <p className="text-xs text-muted-foreground">Another 3D model is currently being viewed</p>
              </div>
            ) : (
              <Skeleton className="w-full h-full" />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Programmatic capture: when captureTrigger prop changes we attempt to read the
  // Note: programmatic capture is intentionally not implemented here. The parent
  // component (`BulkEditDrawer`) captures the canvas directly by querying the
  // offscreen viewer's canvas element and calling toDataURL. Keeping capture
  // logic local to the parent avoids coupling and lifecycle complexity.

  return (
    <div className="relative">
      {/* 3D Viewer */}
      <div 
        className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg overflow-hidden border border-border"
        data-three-active="true"
      >
        <Suspense 
          fallback={
            <div className="w-full h-full flex items-center justify-center">
              <Skeleton className="w-full h-full" />
            </div>
          }
        >
          <Canvas
            key={`canvas-${instanceId.current}`}
            ref={canvasRef}
            {...canvasConfig}
          >
            <Scene modelUrl={modelUrl} autoRotate={autoRotate} materialType={materialType} customColor={customColor} onModelLoaded={onModelLoaded} />
          </Canvas>
        </Suspense>
      </div>

      {/* Controls */}
      <div className="absolute top-3 right-3 flex gap-2">
        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => !isDestroyed && setAutoRotate(!autoRotate)}
              className="bg-background/90 backdrop-blur-sm hover:bg-background border border-border"
              disabled={isDestroyed}
              aria-label={autoRotate ? "Stop auto-rotation" : "Start auto-rotation"}
            >
              <RotateCw className={`h-4 w-4 ${autoRotate ? 'text-primary animate-spin' : ''}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent sideOffset={8}>{autoRotate ? 'Stop auto-rotation' : 'Start auto-rotation'}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => !isDestroyed && setIsWireframe(!isWireframe)}
              className="bg-background/90 backdrop-blur-sm hover:bg-background border border-border"
              disabled={isDestroyed}
              aria-label={isWireframe ? "Solid view" : "Wireframe view"}
            >
              {isWireframe ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent sideOffset={8}>{isWireframe ? 'Solid view' : 'Wireframe view'}</TooltipContent>
        </Tooltip>

        {!is3MF && (
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => !isDestroyed && setMaterialType(materialType === 'standard' ? 'normal' : 'standard')}
                className="bg-background/90 backdrop-blur-sm hover:bg-background border border-border"
                disabled={isDestroyed}
                aria-label={materialType === 'standard' ? "Normal material" : "Standard material"}
              >
                <Palette className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={8}>{materialType === 'standard' ? 'Normal material' : 'Standard material'}</TooltipContent>
          </Tooltip>
        )}
        {/* Capture current view as image */}
        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                try {
                  const canvas = canvasRef.current as HTMLCanvasElement | null;
                  if (!canvas) return;
                  const data = canvas.toDataURL('image/png');
                  if (onCapture) onCapture(data);
                } catch (e) {
                  console.warn('Capture failed', e);
                }
              }}
              className="bg-background/90 backdrop-blur-sm hover:bg-background border border-border"
              disabled={isDestroyed}
              aria-label="Capture view as image"
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent sideOffset={8}>Capture image</TooltipContent>
        </Tooltip>

        {/* Color picker for models */}
        <Tooltip>
          <TooltipTrigger>
            <div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => !isDestroyed && colorInputRef.current?.click()}
                className="bg-background/90 backdrop-blur-sm hover:bg-background border border-border p-0 w-8 h-8 flex items-center justify-center"
                disabled={isDestroyed}
                aria-label="Pick custom color for model"
              >
                <span className="w-4 h-4 rounded border" style={{ background: customColor || '#aaaaaa' }} />
              </Button>
              <input
                ref={colorInputRef}
                type="color"
                value={customColor || '#aaaaaa'}
                onChange={(e) => setCustomColor(e.target.value)}
                className="sr-only"
                disabled={isDestroyed}
                aria-hidden
              />
            </div>
          </TooltipTrigger>
          <TooltipContent sideOffset={8}>Pick custom color</TooltipContent>
        </Tooltip>
      </div>

      {/* Instructions */}
      <div className="mt-3 text-center">
        <p className="text-muted-foreground text-xs">
          Drag to rotate • Scroll to zoom • Right-click to pan
        </p>
      </div>
    </div>
  );
});

ModelViewer3D.displayName = "ModelViewer3D";