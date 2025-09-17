// Shared helpers for normalizing model file paths and triggering downloads
export function normalizeModelPath(url: string | undefined | null): string | null {
  if (!url) return null;
  let resolved = url;
  // If URL starts with '/models/' already, keep as-is
  if (url.startsWith('/models/')) {
    resolved = url;
  } else if (url.startsWith('models/')) {
    // relative without leading slash
    resolved = '/' + url;
  } else {
    // If it's a bare filename or a path without models prefix, make it /models/<path>
    // Strip any leading slashes to avoid double slashes
    const trimmed = url.replace(/^\/+/, '');
    resolved = '/models/' + trimmed;
  }
  return resolved;
}

export function extractFileName(resolvedPath: string | null): string {
  if (!resolvedPath) return '';
  return resolvedPath.split('/').pop() || '';
}

export function triggerDownload(url: string | undefined | null, e?: MouseEvent) {
  if (e && typeof (e as MouseEvent).stopPropagation === 'function') {
    (e as MouseEvent).stopPropagation();
  }
  const resolved = normalizeModelPath(url);
  if (!resolved) return;
  const fileName = extractFileName(resolved);
  const link = document.createElement('a');
  link.href = resolved;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
