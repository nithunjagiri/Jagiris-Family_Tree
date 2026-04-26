const express = require('express');
const { auth, requireAdmin } = require('../middleware/auth');
const { uploadGallery } = require('../middleware/upload');
const photosController = require('../controllers/photosController');
const { resolveFamilyContext } = require('../lib/familyAccess');

const router = express.Router();
router.use(auth);
router.use(resolveFamilyContext);

router.get('/', photosController.list);
router.post('/', uploadGallery.single('image'), photosController.upload);
router.delete('/:id', requireAdmin, photosController.remove);

module.exports = router;
