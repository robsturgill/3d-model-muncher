import { useRef, useState, Suspense, memo, useMemo, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Center, Bounds } from "@react-three/drei";
import { Button } from "./ui/button";
import { Eye, EyeOff, RotateCw, Palette, ImagePlus } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { Skeleton } from "./ui/skeleton";
import { ThreeJSManager, disposeWebGLContext } from "../utils/threeJSManager";
import { ModelMesh } from "./ModelMesh";

interface ModelViewer3DProps {
  modelUrl?: string;
  modelName?: string;
  // callback invoked with a PNG data URL of the current canvas render
  onCapture?: (dataUrl: string) => void;
}


// Memoized scene component

const Scene = memo(({ modelUrl, isWireframe, autoRotate, materialType, customColor }: { modelUrl?: string; isWireframe?: boolean; autoRotate?: boolean; materialType?: 'standard' | 'normal'; customColor?: string }) => {
  return (
    <>
      <PerspectiveCamera makeDefault position={[-66, 79, 83]} rotation={[-0.76, -0.52, -0.44]} fov={20} />
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        // maxDistance={5000}
        autoRotate={autoRotate ?? false}
        autoRotateSpeed={2.0}
      />
  {/* Lighting */}
  {/* @ts-ignore: react-three/fiber JSX intrinsic types */}
  <ambientLight intensity={0.4} />
  {/* @ts-ignore: react-three/fiber JSX intrinsic types */}
  <directionalLight position={[5, 5, 5]} intensity={1} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
  {/* @ts-ignore: react-three/fiber JSX intrinsic types */}
  <directionalLight position={[-5, 3, -5]} intensity={0.5} />
      {/* Environment for reflections */}
      <Environment preset="studio" />
      {/* Model with Bounds for auto-fit */}
      <Suspense fallback={null}>
        {modelUrl ? (
          <Bounds fit clip observe margin={1.2}>
            <Center>
              <ModelMesh 
                modelUrl={modelUrl} 
                isWireframe={isWireframe}
                materialType={materialType}
                customColor={customColor}
              />
            </Center>
          </Bounds>
        ) : null}
      </Suspense>
      {/* Ground plane - commented out to hide */}
      {/* <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#888888" transparent opacity={0.2} />
      </mesh> */}
    </>
  );
});

Scene.displayName = "Scene";


export const ModelViewer3D = memo(({ modelUrl, modelName = "3D Model", onCapture }: ModelViewer3DProps) => {
  const [isWireframe, setIsWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [materialType, setMaterialType] = useState<'standard' | 'normal'>('standard');
  const [customColor, setCustomColor] = useState<string | undefined>(undefined);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [isDestroyed, setIsDestroyed] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const instanceId = useRef(`viewer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [isRegistered, setIsRegistered] = useState(false);

  const is3MF = modelUrl?.toLowerCase().endsWith('.3mf');

  // Reset states when component unmounts or model changes
  useEffect(() => {
    setIsWireframe(false);
    setIsDestroyed(false);
  }, [modelName]);

  // Global Canvas instance management - prevent multiple Three.js instances
  useEffect(() => {
    const currentInstanceId = instanceId.current;
    // Try to register this instance
    const registered = ThreeJSManager.register(currentInstanceId);
    setIsRegistered(registered);
    if (registered) {
      // Small delay to prevent rendering conflicts
      const timer = setTimeout(() => {
        if (ThreeJSManager.isActive(currentInstanceId) && !isDestroyed) {
          setCanvasReady(true);
        }
      }, 100);
      return () => {
        clearTimeout(timer);
        ThreeJSManager.unregister(currentInstanceId);
        setIsDestroyed(true);
        setCanvasReady(false);
        // Clean up WebGL context
        if (canvasRef.current) {
          disposeWebGLContext(canvasRef.current);
        }
      };
    } else {
      // Instance couldn't be registered (too many active)
      console.warn('Could not register 3D viewer instance - another viewer is active');
      return () => {
        setIsDestroyed(true);
      };
    }
  }, [isDestroyed]);

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
            {!isRegistered ? (
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
            <Scene modelUrl={modelUrl} isWireframe={isWireframe} autoRotate={autoRotate} materialType={materialType} customColor={customColor} />
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