const express = require('express');
const { auth, requireAdmin } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');
const familyMembersController = require('../controllers/familyMembersController');
const { resolveFamilyContext } = require('../lib/familyAccess');

const router = express.Router();

router.use(auth);
router.use(resolveFamilyContext);

router.get('/', familyMembersController.list);
router.get('/:id', familyMembersController.get);
router.post('/', uploadSingle.single('profile_photo'), familyMembersController.validateMember, familyMembersController.create);
router.put('/:id', uploadSingle.single('profile_photo'), familyMembersController.validateMember, familyMembersController.update);
router.delete('/:id', familyMembersController.remove);

module.exports = router;
