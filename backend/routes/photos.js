const express = require('express');
const { auth, requireAdmin } = require('../middleware/auth');
const { uploadGallery } = require('../middleware/upload');
const photosController = require('../controllers/photosController');
const { resolveFamilyContext } = require('../lib/familyAccess');
const { requireApprovedFamilyAccess } = require('../middleware/requireApprovedFamilyAccess');

const router = express.Router();
router.use(auth);
router.use(resolveFamilyContext);
router.use(requireApprovedFamilyAccess);

router.get('/', photosController.list);
router.post('/', uploadGallery.array('images', 5), photosController.upload);
router.delete('/:id', requireAdmin, photosController.remove);

module.exports = router;
