// Vitest global setup: enable React act env and prepare test DOM for Radix

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Mock Radix checkbox to a minimal, test-friendly implementation.
import React from 'react';
import { vi } from 'vitest';

vi.mock('@radix-ui/react-checkbox', () => {
  return {
    // Root behaves like a lightweight button element in tests
    Root: (props: any) => React.createElement('button', props, props.children),
    // Indicator is a simple inline element
    Indicator: (props: any) => React.createElement('span', props, props.children),
  };
});

// Create a portal root for Radix components to mount into during tests.
if (typeof document !== 'undefined') {
  const existing = document.getElementById('vitest-portal-root');
  if (!existing) {
    const root = document.createElement('div');
    root.id = 'vitest-portal-root';
  // keep it visually hidden
    root.style.position = 'absolute';
    root.style.width = '0';
    root.style.height = '0';
    root.style.overflow = 'hidden';
    document.body.appendChild(root);
  }
}

  // Ensure @testing-library/react cleans up between tests to avoid DOM leaks.
  import { afterEach } from 'vitest';
  import { cleanup } from '@testing-library/react';

  afterEach(() => {
    cleanup();
  });

// Suppress noisy, benign act() warnings and Radix-related logs in tests.
const originalWarn = console.warn.bind(console);
console.warn = (...args: any[]) => {
  try {
    const joined = args.map((a) => {
      try { return String(a); } catch { return '' }
    }).join(' ');
    const lc = joined.toLowerCase();

    const shouldSuppress = lc.includes('the current testing environment is not configured to support act(') ||
      lc.includes('@radix-ui/react-portal') ||
      (lc.includes('radix') && lc.includes('act('));

    if (shouldSuppress) return;
  } catch (e) {
    // fall through to original
  }
  originalWarn(...args);
};

// Filter the same messages from console.error as well.
const originalError = console.error.bind(console);
console.error = (...args: any[]) => {
  try {
    const joined = args.map((a) => {
      try { return String(a); } catch { return '' }
    }).join(' ');
    const lc = joined.toLowerCase();

    const shouldSuppress = lc.includes('the current testing environment is not configured to support act(') ||
      lc.includes('@radix-ui/react-portal') ||
      (lc.includes('radix') && lc.includes('act('));

    if (shouldSuppress) return;
  } catch (e) {
    // fall through
  }
  originalError(...args);
};

// End of test setup.
