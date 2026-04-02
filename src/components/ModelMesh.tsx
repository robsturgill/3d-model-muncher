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
  materialType?: 'standard' | 'normal';
  customColor?: string;
  onBoundingBox?: (box: THREE.Box3 | null) => void;
}

export function ModelMesh({ modelUrl, isWireframe, materialType = 'standard', customColor, onBoundingBox }: ModelMeshProps) {
  // Determine the file type from the URL
  const fileExtension = modelUrl.toLowerCase().split('.').pop();
  const isSTL = fileExtension === 'stl';
  
  // Load the model with the appropriate loader
  const modelData = useLoader(isSTL ? STLLoader : ThreeMFLoader, modelUrl);
  
  // For STL files, we need to wrap the geometry in a mesh with a material
  // For 3MF files, we get a Group object that can be used directly
  const group = useMemo(() => {
    const material = materialType === 'normal' 
      ? new THREE.MeshNormalMaterial() 
      : new THREE.MeshStandardMaterial({ 
          color: customColor || 0xaaaaaa,
          roughness: 0.4,
          metalness: 0.1
        });

    if (isSTL) {
      // STL loader returns a BufferGeometry, so we need to create a mesh
      const geometry = modelData as THREE.BufferGeometry;
      const mesh = new THREE.Mesh(geometry, material);

      // Create a group to contain the mesh (similar to 3MF structure)
      const group = new THREE.Group();
      group.add(mesh);
      // Rotate the group to make the model upright (common for STL files)
      group.rotation.x = -Math.PI / 2;
      return group;
    } else {
      // Clone the loader's cached Group so we never mutate the cached object.
      // Without cloning, material changes stick to the cache and switching back
      // to standard material becomes impossible.
      const group = (modelData as THREE.Group).clone(true);
      group.traverse((child: any) => {
        if (child.isMesh) {
          if (materialType === 'normal') {
            // Ensure vertex normals exist so MeshNormalMaterial renders correctly
            if (child.geometry && !child.geometry.attributes.normal) {
              child.geometry.computeVertexNormals();
            }
            child.material = material;
          } else if (customColor && child.material) {
            // Tint cloned materials with custom color
            if (Array.isArray(child.material)) {
              child.material.forEach((mat: any) => {
                if (mat.color) mat.color.set(customColor);
              });
            } else if (child.material.color) {
              child.material.color.set(customColor);
            }
          }
          // For 'standard' without customColor, keep the original materials from the clone
        }
      });
      group.rotation.x = -Math.PI / 2;
      return group;
    }
  }, [modelData, isSTL, materialType, customColor]);

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
