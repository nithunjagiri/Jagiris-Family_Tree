const express = require('express');
const { auth, requireAdmin } = require('../middleware/auth');
const placesController = require('../controllers/placesController');
const { resolveFamilyContext } = require('../lib/familyAccess');

const router = express.Router();
router.use(auth);
router.use(resolveFamilyContext);

router.get('/', placesController.list);
router.get('/members-by-place', placesController.membersByPlace);
router.post('/', placesController.validatePlace, placesController.create);
router.delete('/:id', requireAdmin, placesController.remove);

module.exports = router;
