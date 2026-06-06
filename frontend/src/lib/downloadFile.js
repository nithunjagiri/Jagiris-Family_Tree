import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Reject HTML/JSON error payloads masquerading as spreadsheet downloads.
 */
async function assertValidSpreadsheetBlob(blob) {
  const header = new Uint8Array(await blob.slice(0, 64).arrayBuffer());
  const isXlsx = header[0] === 0x50 && header[1] === 0x4b && header[2] === 0x03 && header[3] === 0x04;
  if (isXlsx) return blob;

  const preview = new TextDecoder().decode(header).trimStart().toLowerCase();
  if (preview.startsWith('<!doctype') || preview.startsWith('<html') || preview.startsWith('{')) {
    throw new Error(
      'Export failed: the server returned an invalid file. Deploy the latest backend, then try again.'
    );
  }
  return blob;
}

async function saveToAndroidDownloads(base64, filename) {
  const perm = await Filesystem.checkPermissions();
  if (perm.publicStorage !== 'granted') {
    await Filesystem.requestPermissions();
  }

  const downloadPath = `Download/${filename}`;
  await Filesystem.writeFile({
    path: downloadPath,
    data: base64,
    directory: Directory.ExternalStorage,
    recursive: true,
  });
  return { savedTo: 'Downloads', path: downloadPath };
}

async function saveToDocuments(base64, filename) {
  await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Documents,
    recursive: true,
  });
  return { savedTo: 'Documents', path: filename };
}

/**
 * Save a blob as a downloadable file on web, or directly to device storage on mobile.
 * @param {Blob} blob
 * @param {string} filename
 * @returns {Promise<{ savedTo?: string, path?: string } | void>}
 */
export async function downloadBlobFile(blob, filename) {
  const validBlob = await assertValidSpreadsheetBlob(blob);

  if (Capacitor.isNativePlatform()) {
    const base64 = await blobToBase64(validBlob);

    if (Capacitor.getPlatform() === 'android') {
      try {
        return await saveToAndroidDownloads(base64, filename);
      } catch {
        return saveToDocuments(base64, filename);
      }
    }

    return saveToDocuments(base64, filename);
  }

  const url = window.URL.createObjectURL(validBlob);
  const anchor = document.createElement('a');
  anchor.style.display = 'none';
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    document.body.removeChild(anchor);
  }, 200);
}

/**
 * Parse filename from Content-Disposition response header.
 */
export function filenameFromContentDisposition(header, fallback) {
  if (!header || typeof header !== 'string') return fallback;
  const match = header.match(/filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;]+)/i);
  const raw = match?.[1] || match?.[2] || match?.[3];
  if (!raw) return fallback;
  try {
    return decodeURIComponent(raw.trim());
  } catch {
    return raw.trim();
  }
}
