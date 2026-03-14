const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Invalid file type. Use JPEG, PNG, GIF, or WebP.'), false);
};

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fullPath = path.join(__dirname, '..', 'uploads', 'profiles');
    if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const galleryStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fullPath = path.join(__dirname, '..', 'uploads', 'gallery');
    if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const uploadSingle = multer({ storage: profileStorage, fileFilter, limits: { fileSize: MAX_SIZE } });
const uploadGallery = multer({ storage: galleryStorage, fileFilter, limits: { fileSize: MAX_SIZE } });

module.exports = { uploadSingle, uploadGallery };
