import api from '../services/api';

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
