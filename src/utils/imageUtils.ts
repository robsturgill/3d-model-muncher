// Browser-side image resizing/compression utility.
// Exports a single function that accepts a File and returns a base64 data URL.
export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  maxSizeBytes?: number; // target max bytes for the output
  initialQuality?: number; // 0..1
}

function dataUrlSizeBytes(dataUrl: string) {
  const base64 = dataUrl.split(',')[1] || '';
  // Approximate size in bytes for base64: (base64.length * 3) / 4 - padding
  return Math.ceil((base64.length * 3) / 4);
}

export async function compressImageFile(file: File, opts: CompressOptions = {}): Promise<string> {
  const maxW = opts.maxWidth || 1600;
  const maxH = opts.maxHeight || 1600;
  const maxBytes = opts.maxSizeBytes || 2_000_000; // 2MB default target
  const initialQuality = opts.initialQuality ?? 0.92;

  // Load image
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    image.src = url;
  });

  // Compute target dimensions preserving aspect
  let { width, height } = img;
  let scale = Math.min(1, maxW / width, maxH / height);
  const targetW = Math.max(1, Math.floor(width * scale));
  const targetH = Math.max(1, Math.floor(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  // Fill background white for images with transparency when outputting JPEG
  ctx.clearRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);

  // We'll attempt JPEG first for good compression. If the source is PNG and small, we may keep PNG.
  // Try decreasing quality until under maxBytes or until hitting a lower bound.
  let quality = initialQuality;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  let size = dataUrlSizeBytes(dataUrl);

  // If original is small and JPEG is already under limit, return it.
  if (size <= maxBytes) return dataUrl;

  // Reduce quality in steps to try to hit target size
  while (quality > 0.4) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL('image/jpeg', Math.max(0.1, quality));
    size = dataUrlSizeBytes(dataUrl);
    if (size <= maxBytes) return dataUrl;
  }

  // If still too big, downscale further and retry a final time
  const downscaleFactor = Math.sqrt(maxBytes / size);
  const finalW = Math.max(1, Math.floor(targetW * downscaleFactor));
  const finalH = Math.max(1, Math.floor(targetH * downscaleFactor));
  if (finalW < targetW || finalH < targetH) {
    const canvas2 = document.createElement('canvas');
    canvas2.width = finalW;
    canvas2.height = finalH;
    const ctx2 = canvas2.getContext('2d');
    if (!ctx2) throw new Error('Could not create canvas context');
    ctx2.drawImage(img, 0, 0, finalW, finalH);
    // final pass
    dataUrl = canvas2.toDataURL('image/jpeg', 0.7);
    size = dataUrlSizeBytes(dataUrl);
    if (size <= maxBytes) return dataUrl;
  }

  // Give up and return the last dataUrl (may be above target). It's better than failing.
  return dataUrl;
}
