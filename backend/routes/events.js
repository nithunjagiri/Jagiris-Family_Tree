const express = require('express');
const { auth } = require('../middleware/auth');
const eventsController = require('../controllers/eventsController');

const router = express.Router();
router.use(auth);

router.get('/', eventsController.list);
router.post('/', eventsController.validateEvent, eventsController.add);

module.exports = router;
