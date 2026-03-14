const express = require('express');
const { auth } = require('../middleware/auth');
const familyTreeController = require('../controllers/familyTreeController');

const router = express.Router();
router.use(auth);

router.get('/', familyTreeController.get);

module.exports = router;
