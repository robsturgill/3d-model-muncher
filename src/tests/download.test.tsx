/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react-dom/test-utils';
import { createRoot, Root } from 'react-dom/client';

import * as downloadUtils from '../utils/downloadUtils';
import { ModelCard } from '../components/ModelCard';
import { ModelDetailsDrawer } from '../components/ModelDetailsDrawer';

let container: HTMLDivElement | null = null;
let root: Root | null = null;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  if (root && container) {
    try { root.unmount(); } catch {}
  }
  if (container && container.parentNode) container.parentNode.removeChild(container);
  container = null;
  root = null;
  vi.restoreAllMocks();
});

describe('download behavior', () => {
  it('ModelCard Download button calls triggerDownload with basename only', () => {
  const spy = vi.spyOn(downloadUtils, 'triggerDownload').mockImplementation(() => {});

    const model: any = {
      id: 'm1',
      name: 'Test Model',
      modelUrl: '/models/test/subdir/file.3mf',
      tags: [],
      printSettings: {}
    };

    act(() => {
      root = createRoot(container!);
      root.render(<ModelCard model={model} onClick={() => {}} />);
    });

    // Find the ModelCard Download button inside the rendered container by text
    // (the ModelCard button does not set a title attribute).
    const btn = Array.from(container!.querySelectorAll('button')).find(b => (b.textContent || '').includes('Download')) as HTMLButtonElement | null;
    expect(btn).toBeDefined();

    act(() => {
      btn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const call = spy.mock.calls[0];
    // first arg: original URL, third arg: basename only
    expect(call[0]).toBe(model.modelUrl);
    expect(call[2]).toBe('file.3mf');
  });

  it('ModelDetailsDrawer Download uses normalized path and basename (handles backslashes)', async () => {
  const spy = vi.spyOn(downloadUtils, 'triggerDownload').mockImplementation(() => {});

    const model: any = {
      id: 'm2',
      name: 'Backslash Model',
      // simulate a Windows-y modelUrl containing backslashes
      modelUrl: '/models\\subdir\\my_file.3mf',
      tags: [],
      printSettings: {}
    };

    act(() => {
      root = createRoot(container!);
      root.render(
        <ModelDetailsDrawer
          model={model}
          isOpen={true}
          onClose={() => {}}
          onModelUpdate={() => {}}
          categories={[]}
        />
      );
    });

    // Wait for any microtasks (component effects)
    await Promise.resolve();

    // The drawer renders via portals (Radix) so query the global document
    // for the Download button which sets a title attribute.
    const btn = document.querySelector('button[title="Download model file"]') as HTMLButtonElement | null;
    expect(btn).toBeDefined();

    act(() => {
      btn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const call = spy.mock.calls[0];
    // Ensure the resolved path passed to triggerDownload is normalized (forward slashes)
    // and the basename argument is the simple filename
    expect(call[0]).toBe('/models/subdir/my_file.3mf'.replace(/\\/g, '/'));
    expect(call[2]).toBe('my_file.3mf');
  });
});
