const express = require('express');
const { auth } = require('../middleware/auth');
const familyTreeController = require('../controllers/familyTreeController');
const { resolveFamilyContext } = require('../lib/familyAccess');
const { requireApprovedFamilyAccess } = require('../middleware/requireApprovedFamilyAccess');

const router = express.Router();
router.use(auth);
router.use(resolveFamilyContext);
router.use(requireApprovedFamilyAccess);

router.get('/', familyTreeController.get);

module.exports = router;
