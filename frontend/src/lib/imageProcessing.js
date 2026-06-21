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

function clamp01(value) {
  return Math.min(1, Math.max(0, Number(value) || 0));
}

/**
 * Compute source crop rectangle in image pixel space.
 * Shared by canvas export and crop preview (WYSIWYG).
 */
export function computeCropSourceRect(iw, ih, aspectRatio, zoom, offsetX, offsetY) {
  const z = Math.max(1, Number(zoom) || 1);
  const ox = clamp01(offsetX ?? 0.5);
  const oy = clamp01(offsetY ?? 0.5);
  const ratio = aspectRatio > 0 ? aspectRatio : 1;

  const imageAspect = iw / ih;
  let sw;
  let sh;

  if (imageAspect > ratio) {
    sh = ih / z;
    sw = sh * ratio;
  } else {
    sw = iw / z;
    sh = sw / ratio;
  }

  sw = Math.min(Math.max(1, sw), iw);
  sh = Math.min(Math.max(1, sh), ih);

  const maxX = Math.max(0, iw - sw);
  const maxY = Math.max(0, ih - sh);

  return {
    sx: Math.round(maxX * ox),
    sy: Math.round(maxY * oy),
    sw: Math.round(sw),
    sh: Math.round(sh),
  };
}

/** Preview image style so visible region matches computeCropSourceRect output. */
export function cropPreviewImageStyle(iw, ih, aspectRatio, zoom, offsetX, offsetY) {
  if (!iw || !ih) {
    return { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' };
  }
  const { sx, sy, sw, sh } = computeCropSourceRect(iw, ih, aspectRatio, zoom, offsetX, offsetY);
  return {
    position: 'absolute',
    width: `${(iw / sw) * 100}%`,
    height: `${(ih / sh) * 100}%`,
    left: `${-(sx / sw) * 100}%`,
    top: `${-(sy / sh) * 100}%`,
    maxWidth: 'none',
    maxHeight: 'none',
    touchAction: 'none',
    userSelect: 'none',
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
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const ratio = cropSquare ? 1 : aspectRatio || 1;
  const { sx, sy, sw, sh } = computeCropSourceRect(iw, ih, ratio, zoom, offsetX, offsetY);

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
