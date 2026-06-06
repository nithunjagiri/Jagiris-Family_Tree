export const IMAGE_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const ONE_MB = 1024 * 1024;

export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < ONE_MB) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / ONE_MB).toFixed(bytes >= 10 * ONE_MB ? 0 : 1)} MB`;
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image.'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Could not process image.'));
      },
      'image/jpeg',
      quality
    );
  });
}

function getScaledSize(width, height, maxWidth, maxHeight) {
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

async function renderToCanvas(
  file,
  {
    cropSquare = false,
    aspectRatio = null,
    offsetX = 0.5,
    offsetY = 0.5,
    zoom = 1,
    maxWidth = 1600,
    maxHeight = 1600,
  } = {}
) {
  const img = await loadImageFromFile(file);
  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth || img.width;
  let sh = img.naturalHeight || img.height;

  const ratio = cropSquare ? 1 : aspectRatio;
  if (ratio) {
    const sourceRatio = sw / sh;
    if (sourceRatio > ratio) {
      const baseW = sh * ratio;
      sw = baseW / zoom;
      sh /= zoom;
    } else {
      const baseH = sw / ratio;
      sw /= zoom;
      sh = baseH / zoom;
    }
    const maxX = (img.naturalWidth || img.width) - sw;
    const maxY = (img.naturalHeight || img.height) - sh;
    sx = Math.round(Math.max(0, Math.min(maxX, maxX * offsetX)));
    sy = Math.round(Math.max(0, Math.min(maxY, maxY * offsetY)));
  }

  const size = getScaledSize(sw, sh, maxWidth, maxHeight);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size.width, size.height);
  return canvas;
}

function processedFileName(file, suffix) {
  const base = String(file.name || 'image').replace(/\.[^.]+$/, '');
  return `${base}-${suffix}.jpg`;
}

export async function compressImageFile(
  file,
  {
    targetBytes = ONE_MB,
    cropSquare = false,
    aspectRatio = null,
    offsetX = 0.5,
    offsetY = 0.5,
    zoom = 1,
    maxWidth = 1600,
    maxHeight = 1600,
  } = {}
) {
  let canvas = await renderToCanvas(file, {
    cropSquare,
    aspectRatio,
    offsetX,
    offsetY,
    zoom,
    maxWidth,
    maxHeight,
  });
  let quality = 0.88;
  let blob = await canvasToBlob(canvas, quality);

  while (blob.size > targetBytes && quality > 0.5) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, quality);
  }

  // If quality alone cannot reach the target, progressively reduce dimensions.
  while (blob.size > targetBytes && canvas.width > 640 && canvas.height > 640) {
    const next = document.createElement('canvas');
    next.width = Math.round(canvas.width * 0.85);
    next.height = Math.round(canvas.height * 0.85);
    next.getContext('2d').drawImage(canvas, 0, 0, next.width, next.height);
    canvas = next;
    quality = 0.78;
    blob = await canvasToBlob(canvas, quality);
    while (blob.size > targetBytes && quality > 0.5) {
      quality -= 0.08;
      blob = await canvasToBlob(canvas, quality);
    }
  }

  const suffix = cropSquare ? 'cropped-compressed' : 'compressed';
  return new File([blob], processedFileName(file, suffix), {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

export async function cropImageFile(
  file,
  {
    aspectRatio = 1,
    offsetX = 0.5,
    offsetY = 0.5,
    zoom = 1,
    targetBytes = null,
    maxWidth = 1600,
    maxHeight = 1600,
  } = {}
) {
  if (targetBytes) {
    return compressImageFile(file, {
      targetBytes,
      aspectRatio,
      offsetX,
      offsetY,
      zoom,
      maxWidth,
      maxHeight,
    });
  }
  const canvas = await renderToCanvas(file, {
    aspectRatio,
    offsetX,
    offsetY,
    zoom,
    maxWidth,
    maxHeight,
  });
  const blob = await canvasToBlob(canvas, 0.9);
  return new File([blob], processedFileName(file, 'cropped'), {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}
