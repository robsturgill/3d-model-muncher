// Vitest global setup helpers
// 1) Tell React testing utilities that the environment supports act()
// 2) Ensure a consistent portal root exists for Radix UI portals during tests

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Create a dedicated portal root for Radix portals to mount into during tests.
// Some Radix components render to document.body by default; creating a named
// root reduces the chance of async mount behavior triggering act() warnings.
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

// Suppress noisy Radix "act(...)" warnings which are benign in jsdom tests.
// Be a bit more aggressive: join all args, lowercase, and match a few known patterns
// including stack traces that mention Radix modules.
const originalWarn = console.warn.bind(console);
console.warn = (...args: any[]) => {
  try {
    const joined = args.map((a) => {
      try { return String(a); } catch { return '' }
    }).join(' ');
    const lc = joined.toLowerCase();

    // Patterns to suppress (lowercased):
    const shouldSuppress = lc.includes('the current testing environment is not configured to support act(') ||
      lc.includes('warning: the current testing environment is not configured to support act(') ||
      lc.includes('@radix-ui/react-portal') ||
      lc.includes('@radix-ui/react-presence') ||
      lc.includes('@radix-ui/react-dialog') ||
      lc.includes('@radix-ui/react-scroll-area') ||
      lc.includes('radix') && lc.includes('act(');

    if (shouldSuppress) return;
  } catch (e) {
    // fall through to original
  }
  originalWarn(...args);
};

// React and some libraries log warnings to console.error. Filter the same act() warning there too.
const originalError = console.error.bind(console);
console.error = (...args: any[]) => {
  try {
    const joined = args.map((a) => {
      try { return String(a); } catch { return '' }
    }).join(' ');
    const lc = joined.toLowerCase();

    const shouldSuppress = lc.includes('the current testing environment is not configured to support act(') ||
      lc.includes('warning: the current testing environment is not configured to support act(') ||
      lc.includes('@radix-ui/react-portal') ||
      lc.includes('@radix-ui/react-presence') ||
      lc.includes('@radix-ui/react-dialog') ||
      lc.includes('@radix-ui/react-scroll-area') ||
      (lc.includes('radix') && lc.includes('act('));

    if (shouldSuppress) return;
  } catch (e) {
    // fall through
  }
  originalError(...args);
};

// Keep the setup minimal; additional test polyfills or mocks can be added here if needed.
