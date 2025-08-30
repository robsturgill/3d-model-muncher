import { useRef, useState, Suspense, memo, useMemo, useEffect, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment, Center } from "@react-three/drei";
import { Button } from "./ui/button";
import { RotateCcw, Eye, EyeOff } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { ThreeJSManager, disposeWebGLContext } from "../utils/threeJSManager";

interface ModelViewer3DProps {
  modelUrl?: string;
  modelName?: string;
}

// Memoized placeholder model to prevent re-creation
const PlaceholderModel = memo(({ modelName }: { modelName?: string }) => {
  const meshRef = useRef<any>(null);
  const [isRotating, setIsRotating] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useFrame((state, delta) => {
    if (meshRef.current && isRotating && isMountedRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  // Memoize geometry creation to prevent unnecessary recalculation
  const geometry = useMemo(() => {
    // Safely handle undefined or null modelName
    const name = (modelName || '').toLowerCase();
    
    if (name.includes('dragon') || name.includes('miniature')) {
      return (
        <group ref={meshRef} scale={1.2}>
          {/* Dragon-like shape */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.6, 16, 16]} />
            <meshStandardMaterial color="#8B4513" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.8, 0]}>
            <sphereGeometry args={[0.4, 12, 12]} />
            <meshStandardMaterial color="#8B4513" roughness={0.3} />
          </mesh>
          <mesh position={[-0.8, 0.2, 0.3]} rotation={[0, 0, Math.PI / 4]}>
            <coneGeometry args={[0.3, 1.2, 8]} />
            <meshStandardMaterial color="#654321" roughness={0.3} />
          </mesh>
          <mesh position={[0.8, 0.2, 0.3]} rotation={[0, 0, -Math.PI / 4]}>
            <coneGeometry args={[0.3, 1.2, 8]} />
            <meshStandardMaterial color="#654321" roughness={0.3} />
          </mesh>
        </group>
      );
    } else if (name.includes('vase') || name.includes('planter')) {
      return (
        <mesh ref={meshRef} scale={1.5}>
          <cylinderGeometry args={[0.8, 0.6, 2, 16]} />
          <meshStandardMaterial color="#E6E6FA" roughness={0.1} metalness={0.1} />
        </mesh>
      );
    } else if (name.includes('chess') || name.includes('king')) {
      return (
        <group ref={meshRef} scale={1.3}>
          <mesh position={[0, -0.8, 0]}>
            <cylinderGeometry args={[0.6, 0.6, 0.3, 16]} />
            <meshStandardMaterial color="#2C2C2C" roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.4, 0]}>
            <cylinderGeometry args={[0.4, 0.5, 0.8, 16]} />
            <meshStandardMaterial color="#2C2C2C" roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <sphereGeometry args={[0.35, 16, 16]} />
            <meshStandardMaterial color="#2C2C2C" roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.7, 0]}>
            <coneGeometry args={[0.2, 0.4, 8]} />
            <meshStandardMaterial color="#FFD700" roughness={0.1} metalness={0.8} />
          </mesh>
        </group>
      );
    } else if (name.includes('organizer') || name.includes('tool')) {
      return (
        <group ref={meshRef} scale={1.2}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1.5, 0.8, 1]} />
            <meshStandardMaterial color="#4A90E2" roughness={0.3} />
          </mesh>
          <mesh position={[-0.5, 0.6, 0]}>
            <boxGeometry args={[0.3, 0.4, 0.8]} />
            <meshStandardMaterial color="#357ABD" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.6, 0]}>
            <boxGeometry args={[0.3, 0.4, 0.8]} />
            <meshStandardMaterial color="#357ABD" roughness={0.3} />
          </mesh>
          <mesh position={[0.5, 0.6, 0]}>
            <boxGeometry args={[0.3, 0.4, 0.8]} />
            <meshStandardMaterial color="#357ABD" roughness={0.3} />
          </mesh>
        </group>
      );
    } else {
      // Default phone stand or generic object
      return (
        <group ref={meshRef} scale={1.3}>
          <mesh position={[0, -0.3, 0.3]} rotation={[-Math.PI / 6, 0, 0]}>
            <boxGeometry args={[1, 0.1, 1.2]} />
            <meshStandardMaterial color="#6B7280" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.2, -0.3]}>
            <boxGeometry args={[1, 1, 0.1]} />
            <meshStandardMaterial color="#6B7280" roughness={0.3} />
          </mesh>
        </group>
      );
    }
  }, [modelName]);

  return (
    <Center>
      {geometry}
    </Center>
  );
});

PlaceholderModel.displayName = "PlaceholderModel";

// Memoized scene component
const Scene = memo(({ modelName }: { modelName?: string }) => {
  return (
    <>
      <PerspectiveCamera makeDefault position={[3, 3, 3]} fov={50} />
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={10}
        autoRotate={false}
      />
      
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight
        position={[-5, 3, -5]}
        intensity={0.5}
      />
      
      {/* Environment for reflections */}
      <Environment preset="studio" />
      
      {/* Model */}
      <Suspense fallback={null}>
        <PlaceholderModel modelName={modelName} />
      </Suspense>
      
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#888888" transparent opacity={0.2} />
      </mesh>
    </>
  );
});

Scene.displayName = "Scene";

export const ModelViewer3D = memo(({ modelUrl, modelName = "3D Model" }: ModelViewer3DProps) => {
  const [isWireframe, setIsWireframe] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDestroyed, setIsDestroyed] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const instanceId = useRef(`viewer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [isRegistered, setIsRegistered] = useState(false);

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

  const resetCamera = useCallback(() => {
    // Reset camera would be implemented with camera controls
    if (canvasRef.current && !isDestroyed && isRegistered) {
      // This would reset the camera position in a real implementation
      console.log("Reset camera for viewer:", instanceId.current);
    }
  }, [isDestroyed, isRegistered]);

  // Memoize canvas configuration to prevent recreation
  const canvasConfig = useMemo(() => ({
    shadows: true,
    gl: { 
      antialias: true, 
      alpha: true, 
      preserveDrawingBuffer: false,
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
            <Scene modelName={modelName} />
          </Canvas>
        </Suspense>
      </div>

      {/* Controls */}
      <div className="absolute top-3 right-3 flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => !isDestroyed && setIsWireframe(!isWireframe)}
          className="bg-background/90 backdrop-blur-sm hover:bg-background border border-border"
          disabled={isDestroyed}
          aria-label={isWireframe ? "Switch to solid view" : "Switch to wireframe view"}
        >
          {isWireframe ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={resetCamera}
          className="bg-background/90 backdrop-blur-sm hover:bg-background border border-border"
          disabled={isDestroyed}
          aria-label="Reset camera position"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
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