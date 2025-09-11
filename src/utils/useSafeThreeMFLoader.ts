import { useState, useEffect } from 'react';
// @ts-ignore
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader';
import * as THREE from 'three';

interface LoaderState {
  data: THREE.Group | null;
  error: Error | null;
  loading: boolean;
}

export function useSafeThreeMFLoader(url: string | undefined): LoaderState {
  const [state, setState] = useState<LoaderState>({
    data: null,
    error: null,
    loading: false
  });

  useEffect(() => {
    if (!url) {
      setState({ data: null, error: null, loading: false });
      return;
    }

    console.log('Loading 3MF file:', url);
    setState({ data: null, error: null, loading: true });

    const loader = new ThreeMFLoader();
    const manager = new THREE.LoadingManager();

    // Add timeout for loading
    const timeoutId = setTimeout(() => {
      setState(prev => ({
        ...prev,
        error: new Error('Loading timeout: Model took too long to load'),
        loading: false
      }));
    }, 30000); // 30 second timeout

    loader.load(
      url,
      // onLoad
      (group: THREE.Group) => {
        clearTimeout(timeoutId);
        console.log('Successfully loaded 3MF file:', url);
        setState({ data: group, error: null, loading: false });
      },
      // onProgress
      undefined,
      // onError
      (error: any) => {
        clearTimeout(timeoutId);
        // Log the error for debugging (but mark known issues)
        if (error?.message?.includes('rels') || error?.message?.includes('relationship')) {
          console.warn('3MF Loading Error (known corrupted file):', url, '- Missing rels files');
        } else {
          console.warn('ThreeMFLoader error for', url, ':', error);
        }
        
        let errorMessage = 'Failed to load 3D model';
        
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (error?.message) {
          errorMessage = error.message;
        }

        // Check for specific 3MF file issues
        if (errorMessage.includes('rels') || errorMessage.includes('relationship')) {
          errorMessage = 'Invalid 3MF file format: Missing relationship files. This file may be corrupted or not a valid 3MF file.';
        } else if (errorMessage.includes('3MF')) {
          errorMessage = 'Unable to parse 3MF file. The file may be corrupted or use an unsupported format.';
        }

        setState({
          data: null,
          error: new Error(errorMessage),
          loading: false
        });
      }
    );

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
    };
  }, [url]);

  return state;
}
