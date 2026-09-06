const express = require('express');
const { auth } = require('../middleware/auth');
const searchController = require('../controllers/searchController');
const { resolveFamilyContext } = require('../lib/familyAccess');
const { requireApprovedFamilyAccess } = require('../middleware/requireApprovedFamilyAccess');

const router = express.Router();
router.use(auth);
router.use(resolveFamilyContext);
router.use(requireApprovedFamilyAccess);

router.get('/', searchController.search);

module.exports = router;
