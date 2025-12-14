// Vitest global setup: polyfills, mocks, and env prep — keep critical polyfills first.

// ResizeObserver must be set up FIRST, before any imports, as Radix UI modules check for it during runtime
if (typeof (globalThis as any).ResizeObserver !== 'function') {
  const RO = class ResizeObserver {
    observe() {/* noop */}
    unobserve() {/* noop */}
    disconnect() {/* noop */}
  };
  (globalThis as any).ResizeObserver = RO;
}

import { vi } from 'vitest';

// Also stub it via vitest to ensure it's available in all scopes
vi.stubGlobal('ResizeObserver', (globalThis as any).ResizeObserver);

// 1) Critical DOM polyfills that some UI libs expect during module init
if (typeof window !== 'undefined') {
  // ResizeObserver on window object (in addition to globalThis)
  if (typeof (window as any).ResizeObserver !== 'function') {
    (window as any).ResizeObserver = (globalThis as any).ResizeObserver;
  }

  // matchMedia (used by toasters/theme libs)
  if (typeof (window as any).matchMedia !== 'function') {
    (window as any).matchMedia = (query: string) => {
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {}, // deprecated
        removeListener: () => {}, // deprecated
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      } as MediaQueryList;
    };
  }

  // scrollIntoView (used by Radix Select, etc.)
  const ElementProto = (window as any).Element?.prototype as any;
  if (ElementProto && typeof ElementProto.scrollIntoView !== 'function') {
    ElementProto.scrollIntoView = () => {};
  }
}

// 2) React act environment toggle
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Mock Radix checkbox to a minimal, test-friendly implementation.
import React from 'react';

vi.mock('@radix-ui/react-checkbox', () => {
  return {
    // Root behaves like a lightweight button element in tests
    Root: (props: any) => React.createElement('button', props, props.children),
    // Indicator is a simple inline element
    Indicator: (props: any) => React.createElement('span', props, props.children),
  };
});

// Mock Radix Select to a simple <select> implementation for tests
vi.mock('@radix-ui/react-select', () => {
  const React = require('react') as typeof import('react');
  return {
    Root: ({ children, value, onValueChange, ...rest }: any) => (
      React.createElement(
        'select',
        {
          'data-testid': 'mock-select',
          value,
          onChange: (e: any) => onValueChange && onValueChange(e.target.value),
          ...rest,
        },
        children,
      )
    ),
    Group: (props: any) => React.createElement(React.Fragment, null, props.children),
    Value: ({ placeholder, children }: any) => React.createElement('span', { 'data-testid': 'mock-select-value' }, children || placeholder || ''),
    Trigger: (props: any) => React.createElement('div', props, props.children),
    Content: (props: any) => React.createElement(React.Fragment, null, props.children),
    Item: ({ value, children, ...rest }: any) => React.createElement('option', { value, ...rest }, children),
    Label: (props: any) => React.createElement('label', props, props.children),
    Separator: (props: any) => React.createElement('hr', props),
    ScrollUpButton: (props: any) => React.createElement('div', props, props.children),
    ScrollDownButton: (props: any) => React.createElement('div', props, props.children),
    Icon: (props: any) => React.createElement(React.Fragment, null, props.children),
  };
});

// Mock Radix Slider to a minimal range input to avoid ResizeObserver usage during tests
vi.mock('@radix-ui/react-slider', () => {
  const React = require('react') as typeof import('react');
  const Root = ({ value, defaultValue, onValueChange, min = 0, max = 100, step = 1, ...rest }: any) => {
    const valArr = Array.isArray(value) ? value : (Array.isArray(defaultValue) ? defaultValue : [value ?? defaultValue ?? 0]);
    const current = Number(valArr?.[0] ?? 0);
    return React.createElement('input', {
      type: 'range',
      'aria-label': 'slider',
      min,
      max,
      step,
      value: current,
      onChange: (e: any) => onValueChange && onValueChange([Number(e.target.value)]),
      ...rest,
    });
  };
  const Passthrough = (props: any) => React.createElement('div', props, props.children);
  return { Root, Track: Passthrough, Range: Passthrough, Thumb: Passthrough };
});

// Avoid pulling ResizeObserver from Radix size hook by mocking it to a no-op
vi.mock('@radix-ui/react-use-size', () => {
  return {
    useSize: () => undefined,
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
