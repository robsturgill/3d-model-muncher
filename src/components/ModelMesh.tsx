import { useLoader } from '@react-three/fiber';
import { useMemo, createElement } from 'react';
// @ts-ignore
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader';
// @ts-ignore
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import * as THREE from 'three';

interface ModelMeshProps {
  modelUrl: string;
  isWireframe?: boolean;
  onBoundingBox?: (box: THREE.Box3 | null) => void;
}

export function ModelMesh({ modelUrl, isWireframe, onBoundingBox }: ModelMeshProps) {
  // Determine the file type from the URL
  const fileExtension = modelUrl.toLowerCase().split('.').pop();
  const isSTL = fileExtension === 'stl';
  
  // Load the model with the appropriate loader
  const modelData = useLoader(isSTL ? STLLoader : ThreeMFLoader, modelUrl);
  
  // For STL files, we need to wrap the geometry in a mesh with a material
  // For 3MF files, we get a Group object that can be used directly
  const group = useMemo(() => {
    if (isSTL) {
      // STL loader returns a BufferGeometry, so we need to create a mesh
      const geometry = modelData as THREE.BufferGeometry;
      const material = new THREE.MeshStandardMaterial({ 
        color: 0xaaaaaa,
        roughness: 0.4,
        metalness: 0.1
      });
      const mesh = new THREE.Mesh(geometry, material);
      
      // Create a group to contain the mesh (similar to 3MF structure)
      const group = new THREE.Group();
      group.add(mesh);
      // Rotate the group to make the model upright (common for STL files)
      group.rotation.x = -Math.PI / 2;
      return group;
    } else {
      // 3MF loader returns a Group object directly
      const group = modelData as THREE.Group;
      // Rotate the group to make the model upright (consistent with STL)
      group.rotation.x = -Math.PI / 2;
      return group;
    }
  }, [modelData, isSTL]);

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
  // Use createElement to bypass type checking for 'primitive'
  return createElement('primitive', { object: group });
}
