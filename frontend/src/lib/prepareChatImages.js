import { compressImageFile } from './imageProcessing';
import {
  CHAT_COMPRESS_CONCURRENCY,
  CHAT_IMAGE_MAX_DIMENSION,
  CHAT_IMAGE_TARGET_BYTES,
  CHAT_UPLOAD_MAX_BYTES,
} from './chatMediaConstants';

const COMPRESS_ATTEMPTS = [
  { maxWidth: CHAT_IMAGE_MAX_DIMENSION, maxHeight: CHAT_IMAGE_MAX_DIMENSION },
  { maxWidth: 960, maxHeight: 960 },
  { maxWidth: 640, maxHeight: 640 },
];

async function readImageDimensions(file) {
  if (typeof createImageBitmap !== 'undefined') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const size = { width: bitmap.width, height: bitmap.height };
      bitmap.close?.();
      return size;
    } catch {
      // fall through
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image.'));
    };
    img.src = url;
  });
}

async function prepareOne(file) {
  let lastError = null;
  for (const dims of COMPRESS_ATTEMPTS) {
    try {
      const processed = await compressImageFile(file, {
        targetBytes: CHAT_IMAGE_TARGET_BYTES,
        maxWidth: dims.maxWidth,
        maxHeight: dims.maxHeight,
      });
      if (processed.size <= CHAT_UPLOAD_MAX_BYTES) {
        const { width, height } = await readImageDimensions(processed);
        return { file: processed, width, height, byteSize: processed.size };
      }
      lastError = new Error('Image still too large after compression.');
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('Could not compress image enough. Try a smaller photo.');
}

async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => runWorker());
  await Promise.all(workers);
  return results;
}

/**
 * Compress chat images toward ~500 KB with EXIF-aware dimensions and upload safety checks.
 * @param {File[]} files
 * @returns {Promise<Array<{ file: File, width: number, height: number, byteSize: number }>>}
 */
export async function prepareChatImages(files) {
  const list = Array.from(files || []);
  if (list.length === 0) return [];
  return runWithConcurrency(list, CHAT_COMPRESS_CONCURRENCY, (file) => prepareOne(file));
}
