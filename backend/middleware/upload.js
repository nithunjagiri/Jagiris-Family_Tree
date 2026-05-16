const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../lib/cloudinary');

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Invalid file type. Use JPEG, PNG, GIF, or WebP.'), false);
};

const useCloudinary = !!process.env.CLOUDINARY_CLOUD_NAME;

function makeLocalStorage(subfolder) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const fullPath = path.join(__dirname, '..', 'uploads', subfolder);
      if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
      cb(null, fullPath);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  });
}

function makeCloudinaryStorage(folder) {
  return new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `jagiris-family/${folder}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    },
  });
}

const profileStorage = useCloudinary
  ? makeCloudinaryStorage('profiles')
  : makeLocalStorage('profiles');

const galleryStorage = useCloudinary
  ? makeCloudinaryStorage('gallery')
  : makeLocalStorage('gallery');

const uploadSingle = multer({ storage: profileStorage, fileFilter, limits: { fileSize: MAX_SIZE } });
const uploadGallery = multer({ storage: galleryStorage, fileFilter, limits: { fileSize: MAX_SIZE } });

module.exports = { uploadSingle, uploadGallery, useCloudinary };
