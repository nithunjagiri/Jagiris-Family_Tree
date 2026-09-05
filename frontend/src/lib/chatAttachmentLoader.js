import api from '../services/api';
import { downloadImageFile } from './downloadFile';

const blobCache = new Map();

export function getAttachmentApiPath(attachmentId) {
  return `/messages/attachments/${attachmentId}`;
}

export async function fetchChatAttachmentBlob(attachmentId) {
  const key = String(attachmentId);
  const cached = blobCache.get(key);
  if (typeof cached === 'string') return cached;

  const promise = api
    .get(getAttachmentApiPath(attachmentId), { responseType: 'blob' })
    .then((res) => {
      const url = URL.createObjectURL(res.data);
      blobCache.set(key, url);
      return url;
    })
    .catch((err) => {
      blobCache.delete(key);
      throw err;
    });

  blobCache.set(key, promise);
  return promise;
}

export function revokeChatAttachmentBlob(attachmentId) {
  const key = String(attachmentId);
  const cached = blobCache.get(key);
  if (cached && typeof cached === 'string' && cached.startsWith('blob:')) {
    URL.revokeObjectURL(cached);
  }
  blobCache.delete(key);
}

export function clearChatAttachmentCache() {
  for (const value of blobCache.values()) {
    if (typeof value === 'string' && value.startsWith('blob:')) {
      URL.revokeObjectURL(value);
    }
  }
  blobCache.clear();
}

function chatImageFilename(attachment) {
  const id = attachment?.id;
  const base = id && !String(id).startsWith('local-') ? `chat-${id}` : `chat-${Date.now()}`;
  return `${base}.jpg`;
}

/** Fetch attachment bytes (not object URL). */
export async function fetchChatAttachmentBlobData(attachment) {
  if (attachment?.localPreview) {
    const res = await fetch(attachment.localPreview);
    return res.blob();
  }
  const res = await api.get(getAttachmentApiPath(attachment.id), { responseType: 'blob' });
  return res.data;
}

/** Download a chat image on web or save to device on mobile. */
export async function downloadChatAttachment(attachment) {
  const blob = await fetchChatAttachmentBlobData(attachment);
  return downloadImageFile(blob, chatImageFilename(attachment));
}
