// Global ThreeJS instance manager to prevent multiple instances and conflicts
class ThreeJSManagerClass {
  private activeInstances = new Set<string>();
  private readonly maxInstances = 1; // Only allow one active 3D viewer at a time
  private cleanupTimer: NodeJS.Timeout | null = null;

  register(id: string): boolean {
    // Clear any pending cleanup
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // If we're at max capacity, don't allow new instances
    if (this.activeInstances.size >= this.maxInstances) {
      console.warn(`ThreeJS: Cannot register instance ${id}. Max instances (${this.maxInstances}) reached.`);
      return false;
    }

    this.activeInstances.add(id);
    console.log(`ThreeJS: Registered instance ${id}. Active instances: ${this.activeInstances.size}`);
    return true;
  }

  unregister(id: string): void {
    const wasActive = this.activeInstances.has(id);
    this.activeInstances.delete(id);
    
    if (wasActive) {
      console.log(`ThreeJS: Unregistered instance ${id}. Active instances: ${this.activeInstances.size}`);
    }

    // Schedule cleanup of WebGL contexts after a delay
    this.scheduleCleanup();
  }

  isActive(id: string): boolean {
    return this.activeInstances.has(id);
  }

  getActiveCount(): number {
    return this.activeInstances.size;
  }

  forceUnregisterAll(): void {
    const count = this.activeInstances.size;
    this.activeInstances.clear();
    console.warn(`ThreeJS: Force unregistered all instances. Cleared ${count} instances.`);
    this.scheduleCleanup();
  }

  private scheduleCleanup(): void {
    // Clear any existing cleanup timer
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
    }

    // Schedule cleanup after instances are cleared
    this.cleanupTimer = setTimeout(() => {
      this.performGlobalCleanup();
      this.cleanupTimer = null;
    }, 100);
  }

  private performGlobalCleanup(): void {
    try {
      // Force garbage collection if available (dev tools)
      if (typeof window !== 'undefined' && (window as any).gc) {
        (window as any).gc();
      }

      // Clean up any orphaned WebGL contexts
      const canvases = document.querySelectorAll('canvas');
      canvases.forEach(canvas => {
        try {
          const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
          if (gl) {
            const extension = gl.getExtension('WEBGL_lose_context');
            if (extension && !canvas.closest('[data-three-active="true"]')) {
              extension.loseContext();
            }
          }
        } catch (error) {
          // Silently handle cleanup errors
        }
      });
    } catch (error) {
      console.warn('ThreeJS cleanup error:', error);
    }
  }
}

// Export singleton instance
export const ThreeJSManager = new ThreeJSManagerClass();

// Utility function to safely dispose of WebGL contexts
export const disposeWebGLContext = (canvas: HTMLCanvasElement): void => {
  try {
    const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
    if (gl) {
      const extension = gl.getExtension('WEBGL_lose_context');
      if (extension) {
        extension.loseContext();
      }
    }
  } catch (error) {
    console.warn('Error disposing WebGL context:', error);
  }
};