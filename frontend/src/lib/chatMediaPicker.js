import { Capacitor } from '@capacitor/core';
import { CHAT_MAX_IMAGES_PER_SEND } from './chatMediaConstants';
import { isNativeApp } from './mobile';

const ACCEPT = 'image/jpeg,image/png,image/webp';

async function ensureCameraPermissions() {
  if (!isNativeApp()) return;
  try {
    const { Camera } = await import('@capacitor/camera');
    const current = await Camera.checkPermissions();
    if (current.camera === 'granted' && current.photos === 'granted') return;
    const requested = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
    if (requested.camera !== 'granted' && requested.photos !== 'granted') {
      throw new Error('Camera or photo library permission is required.');
    }
  } catch (err) {
    if (err.message?.includes('permission')) throw err;
    throw new Error('Could not access camera. Check app permissions.');
  }
}

async function uriToFile(uri, name = 'chat-photo.jpg') {
  const response = await fetch(uri);
  const blob = await response.blob();
  const type = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
  return new File([blob], name, { type, lastModified: Date.now() });
}

async function base64ToFile(base64, name = 'chat-photo.jpg') {
  const dataUrl = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
}

function pickFilesFromInput({ multiple = true, capture = false } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ACCEPT;
    if (multiple) input.multiple = true;
    if (capture) input.setAttribute('capture', 'environment');
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener(
      'change',
      () => {
        const files = Array.from(input.files || []);
        input.remove();
        resolve(files);
      },
      { once: true }
    );
    input.click();
  });
}

/**
 * @param {number} maxCount remaining slots (1–5)
 * @returns {Promise<File[]>}
 */
export async function pickChatImagesFromGallery(maxCount = CHAT_MAX_IMAGES_PER_SEND) {
  const limit = Math.max(1, Math.min(CHAT_MAX_IMAGES_PER_SEND, maxCount));
  if (isNativeApp() && Capacitor.isPluginAvailable('Camera')) {
    await ensureCameraPermissions();
    const { Camera } = await import('@capacitor/camera');
    const result = await Camera.pickImages({ quality: 90, limit });
    const files = [];
    for (let i = 0; i < (result.photos || []).length; i += 1) {
      const photo = result.photos[i];
      if (photo.webPath) {
        files.push(await uriToFile(photo.webPath, `chat-gallery-${Date.now()}-${i}.jpg`));
      } else if (photo.path) {
        files.push(await uriToFile(photo.path, `chat-gallery-${Date.now()}-${i}.jpg`));
      }
    }
    return files.slice(0, limit);
  }
  const files = await pickFilesFromInput({ multiple: true });
  return files.slice(0, limit);
}

/**
 * @returns {Promise<File[]>} single captured photo
 */
export async function captureChatImageFromCamera() {
  if (isNativeApp() && Capacitor.isPluginAvailable('Camera')) {
    await ensureCameraPermissions();
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    const photo = await Camera.getPhoto({
      quality: 90,
      source: CameraSource.Camera,
      resultType: CameraResultType.Uri,
    });
    if (photo.webPath) {
      return [await uriToFile(photo.webPath, `chat-camera-${Date.now()}.jpg`)];
    }
    if (photo.path) {
      return [await uriToFile(photo.path, `chat-camera-${Date.now()}.jpg`)];
    }
    if (photo.base64String) {
      return [await base64ToFile(photo.base64String, `chat-camera-${Date.now()}.jpg`)];
    }
    throw new Error('Could not read captured photo.');
  }
  const files = await pickFilesFromInput({ multiple: false, capture: true });
  return files.slice(0, 1);
}
