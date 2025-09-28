import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { SharedModelScene } from '../components/SharedModelScene';
import { ConfigManager } from '../utils/configManager';


// Shared scene for offscreen capture, matching color from config
function OffscreenScene({ modelUrl, onModelLoaded }: { modelUrl?: string; onModelLoaded?: () => void }) {
  // Get color from config, fallback to default
  let customColor: string | undefined = undefined;
  try {
    const config = ConfigManager.loadConfig();
    customColor = config?.settings?.defaultModelColor || '#aaaaaa';
  } catch {}
  return (
    <SharedModelScene
      modelUrl={modelUrl}
      customColor={customColor}
      onModelLoaded={onModelLoaded}
    />
  );
}

class RendererPoolClass {
  private container: HTMLDivElement | null = null;
  private root: Root | null = null;
  private mounted = false;

  async ensureMounted() {
    if (this.mounted) return;
    this.container = document.createElement('div');
    this.container.style.position = 'fixed';
    this.container.style.left = '-9999px';
    this.container.style.top = '0';
  this.container.style.width = '637px';
  this.container.style.height = '637px';
    this.container.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.container);
    this.root = createRoot(this.container);
    this.mounted = true;
  }

  async captureModel(modelUrl?: string, timeout = 20000): Promise<string | null> {
    await this.ensureMounted();
    if (!this.root || !this.container) return null;

    return await new Promise<string | null>((resolve) => {
      let canvasEl: HTMLCanvasElement | null = null;
      let unmounted = false;
      const cleanup = async () => {
        if (!unmounted) {
          if (this.root) {
            try { this.root.unmount(); } catch (e) {}
          }
          if (this.container) {
            try { document.body.removeChild(this.container); } catch (e) {}
          }
          this.root = null;
          this.container = null;
          this.mounted = false;
          unmounted = true;
          // Small delay to allow browser to release WebGL context
          await new Promise(res => setTimeout(res, 100));
        }
      };
      const timeoutId = setTimeout(async () => {
        await cleanup();
        resolve(null);
      }, timeout);

      const onModelLoaded = () => {
        if (unmounted) return;
        // Wait for bounds/camera fit animation to finish (match main viewer zoom-out)
        setTimeout(async () => {
          if (unmounted) return;
          canvasEl = this.container!.querySelector('canvas') as HTMLCanvasElement | null;
          if (canvasEl) {
            try {
              const data = canvasEl.toDataURL('image/png');
              clearTimeout(timeoutId);
              await cleanup();
              resolve(data);
            } catch (e) {
              clearTimeout(timeoutId);
              await cleanup();
              resolve(null);
            }
          } else {
            setTimeout(async () => {
              if (unmounted) return;
              canvasEl = this.container!.querySelector('canvas') as HTMLCanvasElement | null;
              if (canvasEl) {
                try {
                  const data = canvasEl.toDataURL('image/png');
                  clearTimeout(timeoutId);
                  await cleanup();
                  resolve(data);
                } catch (e) {
                  clearTimeout(timeoutId);
                  await cleanup();
                  resolve(null);
                }
              } else {
                clearTimeout(timeoutId);
                await cleanup();
                resolve(null);
              }
            }, 300);
          }
        }, 600); // Increased delay to allow zoom-out animation to finish
      };

      // Render the offscreen scene into the root
      if (!unmounted) {
        this.root!.render(
          React.createElement(
            'div',
            { style: { width: 637, height: 637 } },
            React.createElement(
              Canvas,
              {
                shadows: true,
                style: { width: '637px', height: '637px', background: 'transparent' },
                gl: { antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' },
                dpr: Math.min(window.devicePixelRatio, 2),
                frameloop: 'demand'
              },
              React.createElement(OffscreenScene, { modelUrl, onModelLoaded })
            )
          )
        );
      }
    });
  }
}

export const RendererPool = new RendererPoolClass();

export default RendererPool;
