// Shared helpers for normalizing model file paths and triggering downloads
export function normalizeModelPath(url: string | undefined | null): string | null {
  if (!url) return null;
  // Normalize backslashes to forward slashes so we handle Windows paths
  let resolved = url.replace(/\\/g, '/');
  // If URL starts with '/models/' already, keep as-is
  if (resolved.startsWith('/models/')) {
    // resolved as normalized
  } else if (resolved.startsWith('models/')) {
    // relative without leading slash
    resolved = '/' + resolved;
  } else {
    // If it's a bare filename or a path without models prefix, make it /models/<path>
    // Strip any leading slashes to avoid double slashes
    const trimmed = resolved.replace(/^\/+/, '');
    resolved = '/models/' + trimmed;
  }
  return resolved;
}

export function extractFileName(resolvedPath: string | null): string {
  if (!resolvedPath) return '';
  // Support both forward and backward slashes to be defensive
  const parts = resolvedPath.split(/[/\\]/);
  return parts.pop() || '';
}

/**
 * Trigger a browser download for a given model path.
 * @param url - the path or URL to the resource (may be a relative path like 'models/sub/file.stl' or '/models/sub/file.stl')
 * @param e - optional MouseEvent to stop propagation
 * @param downloadName - optional filename to use for the saved file (if omitted, derived from the URL)
 */
export function triggerDownload(url: string | undefined | null, e?: MouseEvent, downloadName?: string) {
  if (e && typeof (e as MouseEvent).stopPropagation === 'function') {
    (e as MouseEvent).stopPropagation();
  }
  const resolved = normalizeModelPath(url);
  if (!resolved) return;
  const fileName = typeof downloadName === 'string' && downloadName ? downloadName : extractFileName(resolved);
  // No debug logging here in normal operation — caller should pass a clean basename.
  const link = document.createElement('a');
  link.href = resolved;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
