import * as React from "react";
import { Suspense, memo } from "react";
import { PerspectiveCamera, OrbitControls, Environment, Center, Bounds } from "@react-three/drei";
import { ModelMesh } from "./ModelMesh";

interface SharedModelSceneProps {
  modelUrl?: string;
  customColor?: string;
  autoRotate?: boolean;
  materialType?: "standard" | "normal";
  onModelLoaded?: () => void;
}

export const SharedModelScene = memo(({
  modelUrl,
  customColor,
  autoRotate = false,
  materialType = "standard",
  onModelLoaded,
}: SharedModelSceneProps) => {
  const loadedRef = React.useRef(false);
  return (
    <>
      <PerspectiveCamera makeDefault position={[-66, 79, 83]} rotation={[-0.76, -0.52, -0.44]} fov={20} />
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        autoRotate={autoRotate}
        autoRotateSpeed={2.0}
      />
  {/* @ts-ignore: react-three/fiber JSX intrinsic types */}
  <ambientLight intensity={0.4} />
  {/* @ts-ignore: react-three/fiber JSX intrinsic types */}
  <directionalLight position={[5, 5, 5]} intensity={1} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
  {/* @ts-ignore: react-three/fiber JSX intrinsic types */}
  <directionalLight position={[-5, 3, -5]} intensity={0.5} />
      <Environment preset="studio" />
      <Suspense fallback={null}>
        {modelUrl ? (
          <Bounds fit clip observe margin={1.2}>
            <Center>
              <ModelMesh
                modelUrl={modelUrl}
                materialType={materialType}
                customColor={customColor}
                onBoundingBox={(box) => {
                  if (!loadedRef.current && box && !box.isEmpty()) {
                    loadedRef.current = true;
                    try { onModelLoaded && onModelLoaded(); } catch (e) {}
                  }
                }}
              />
            </Center>
          </Bounds>
        ) : null}
      </Suspense>
    </>
  );
});

SharedModelScene.displayName = "SharedModelScene";
