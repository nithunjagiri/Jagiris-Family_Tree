const express = require('express');
const { auth } = require('../middleware/auth');
const eventsController = require('../controllers/eventsController');
const { resolveFamilyContext } = require('../lib/familyAccess');
const { uploadEvent } = require('../middleware/upload');

const router = express.Router();
router.use(auth);
router.use(resolveFamilyContext);

router.get('/', eventsController.list);
router.get('/:id', eventsController.get);
router.post('/', uploadEvent.single('image'), eventsController.validateEvent, eventsController.add);
router.put('/:id', uploadEvent.single('image'), eventsController.validateEvent, eventsController.update);
router.delete('/:id', eventsController.remove);

module.exports = router;
