const express = require('express');
const { auth } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');
const familyMembersController = require('../controllers/familyMembersController');
const { resolveFamilyContext } = require('../lib/familyAccess');
const { requireApprovedFamilyAccess } = require('../middleware/requireApprovedFamilyAccess');

const router = express.Router();

router.use(auth);
router.use(resolveFamilyContext);

// Pending users may GET (empty list for dashboard KPIs); writes require approval.
router.get('/meta/linkable-users', requireApprovedFamilyAccess, familyMembersController.listLinkableUsers);
router.get('/', familyMembersController.list);
router.get('/:id', requireApprovedFamilyAccess, familyMembersController.get);
router.post('/', requireApprovedFamilyAccess, uploadSingle.single('profile_photo'), familyMembersController.validateMember, familyMembersController.create);
router.put('/:id', requireApprovedFamilyAccess, uploadSingle.single('profile_photo'), familyMembersController.validateMember, familyMembersController.update);
router.delete('/:id', requireApprovedFamilyAccess, familyMembersController.remove);

module.exports = router;
