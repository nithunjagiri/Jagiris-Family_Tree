const path = require('path');
const fs = require('fs');
const cloudinary = require('./cloudinary');
const { useCloudinary } = require('../middleware/upload');

function extractCloudinaryPublicId(url) {
  try {
    const parts = String(url).split('/upload/');
    if (parts.length < 2) return null;
    const afterUpload = parts[1].replace(/^v\d+\//, '');
    return afterUpload.replace(/\.[^.]+$/, '');
  } catch {
    return null;
  }
}

function resolveStoredPath(file) {
  if (!file) return null;
  return useCloudinary ? file.path : `/uploads/chat/${file.filename}`;
}

async function deleteStoredPath(imagePath) {
  if (!imagePath) return;
  if (useCloudinary && /^https?:\/\//i.test(imagePath)) {
    const publicId = extractCloudinaryPublicId(imagePath);
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (_) {}
    }
    return;
  }
  const relative = String(imagePath).replace(/^\/uploads\//, '');
  const fullPath = path.join(__dirname, '..', 'uploads', relative);
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
    } catch (_) {}
  }
}

async function deleteUploadedFiles(files) {
  const list = Array.isArray(files) ? files : [];
  await Promise.all(
    list.map(async (file) => {
      const stored = file.storedPath || resolveStoredPath(file);
      await deleteStoredPath(stored);
    })
  );
}

function localFileAbsolutePath(imagePath) {
  const relative = String(imagePath).replace(/^\/uploads\//, '');
  return path.join(__dirname, '..', 'uploads', relative);
}

module.exports = {
  resolveStoredPath,
  deleteStoredPath,
  deleteUploadedFiles,
  localFileAbsolutePath,
  extractCloudinaryPublicId,
};
