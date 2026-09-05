/**
 * Group flat photo rows into albums for gallery display.
 * Priority: upload_batch_id > legacy (title + upload minute bucket).
 */

function minuteBucket(isoOrDate) {
  if (!isoOrDate) return 'unknown';
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return 'unknown';
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${day}T${h}:${min}`;
}

function albumKey(photo) {
  if (photo.upload_batch_id) {
    return `batch:${photo.upload_batch_id}`;
  }
  const title = String(photo.title || 'Untitled').trim().toLowerCase();
  return `legacy:${title}::${minuteBucket(photo.uploaded_at)}`;
}

/**
 * @param {Array<{ id, title, image_path, uploaded_at, upload_batch_id? }>} photos
 * @returns {Array<{ key, title, uploaded_at, coverPhoto, photos, count }>}
 */
export function groupPhotosByAlbum(photos) {
  if (!Array.isArray(photos) || photos.length === 0) return [];

  const map = new Map();

  for (const photo of photos) {
    const key = albumKey(photo);
    if (!map.has(key)) {
      map.set(key, {
        key,
        title: photo.title || 'Untitled',
        uploaded_at: photo.uploaded_at,
        coverPhoto: photo,
        photos: [],
        count: 0,
      });
    }
    const album = map.get(key);
    album.photos.push(photo);
    album.count = album.photos.length;
    if (photo.uploaded_at && (!album.uploaded_at || new Date(photo.uploaded_at) > new Date(album.uploaded_at))) {
      album.uploaded_at = photo.uploaded_at;
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.uploaded_at || 0) - new Date(a.uploaded_at || 0)
  );
}
