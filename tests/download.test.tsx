/* @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import * as downloadUtils from '../src/utils/downloadUtils';
import { ModelCard } from '../src/components/ModelCard';
import { ModelDetailsDrawer } from '../src/components/ModelDetailsDrawer';

// Ensure ResizeObserver is available for Radix ScrollArea
beforeAll(() => {
  if (typeof window !== 'undefined' && typeof (window as any).ResizeObserver !== 'function') {
    (window as any).ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('download behavior', () => {
  it('ModelCard Download button calls triggerDownload with basename only', async () => {
    const spy = vi.spyOn(downloadUtils, 'triggerDownload').mockImplementation(() => {});

    const model: any = {
      id: 'm1',
      name: 'Test Model',
      modelUrl: '/models/test/subdir/file.3mf',
      tags: [],
      printSettings: {}
    };

    const { container } = render(<ModelCard model={model} onClick={() => {}} />);

    // Find the ModelCard Download button inside the rendered container by text
    // (the ModelCard button does not set a title attribute).
    const btn = Array.from(container.querySelectorAll('button')).find(b => 
      (b.textContent || '').includes('Download')
    ) as HTMLButtonElement;
    expect(btn).toBeDefined();

    const user = userEvent.setup();
    await user.click(btn);

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

    render(
      <ModelDetailsDrawer
        model={model}
        isOpen={true}
        onClose={() => {}}
        onModelUpdate={() => {}}
        categories={[]}
      />
    );

    // Wait for the drawer to render fully (Radix portal takes time to mount)
    const btn = await screen.findByTitle('Download model file', {}, { timeout: 3000 });
    expect(btn).toBeDefined();

    const user = userEvent.setup();
    await user.click(btn);

    expect(spy).toHaveBeenCalledTimes(1);
    const call = spy.mock.calls[0];
    // Ensure the resolved path passed to triggerDownload is normalized (forward slashes)
    // and the basename argument is the simple filename
    expect(call[0]).toBe('/models/subdir/my_file.3mf');
    expect(call[2]).toBe('my_file.3mf');
  });
});
