const express = require('express');
const { auth } = require('../middleware/auth');
const searchController = require('../controllers/searchController');
const { resolveFamilyContext } = require('../lib/familyAccess');

const router = express.Router();
router.use(auth);
router.use(resolveFamilyContext);

router.get('/', searchController.search);

module.exports = router;
