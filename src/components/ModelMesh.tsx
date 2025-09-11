import { useLoader } from '@react-three/fiber';
import { useMemo } from 'react';
import '@react-three/fiber';
// @ts-ignore
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader';
import * as THREE from 'three';

interface ModelMeshProps {
  modelUrl: string;
  isWireframe?: boolean;
  onBoundingBox?: (box: THREE.Box3 | null) => void;
}

export function ModelMesh({ modelUrl, isWireframe, onBoundingBox }: ModelMeshProps) {
  // Load the 3MF model as a Group - revert to original working approach
  const group = useLoader(ThreeMFLoader, modelUrl);

  // Recursively set wireframe on all mesh materials if needed
  useMemo(() => {
    if (group && isWireframe !== undefined) {
      group.traverse((child: any) => {
        if (child.isMesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat: any) => {
              mat.wireframe = isWireframe;
            });
          } else {
            child.material.wireframe = isWireframe;
          }
        }
      });
    }
  }, [group, isWireframe]);

  // Compute bounding box and call onBoundingBox
  useMemo(() => {
    if (group && onBoundingBox) {
      const box = new THREE.Box3().setFromObject(group);
      if (box.isEmpty()) {
        onBoundingBox(null);
      } else {
        onBoundingBox(box);
      }
    } else if (onBoundingBox) {
      onBoundingBox(null);
    }
    // Only run when group or onBoundingBox changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, onBoundingBox]);

  // The loaded group is a THREE.Group, which can be rendered as a primitive
  // But to avoid type errors, cast as any
  return <primitive object={group as any} />;
}
