const express = require('express');
const { auth } = require('../middleware/auth');
const familyTreeController = require('../controllers/familyTreeController');
const { resolveFamilyContext } = require('../lib/familyAccess');

const router = express.Router();
router.use(auth);
router.use(resolveFamilyContext);

router.get('/', familyTreeController.get);

module.exports = router;
