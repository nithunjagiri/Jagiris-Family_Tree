const express = require('express');
const { auth, requireAdmin } = require('../middleware/auth');
const { resolveFamilyContext } = require('../lib/familyAccess');
const ctrl = require('../controllers/notificationsController');

const router = express.Router();

// Token registration (authenticated users)
router.post('/token', auth, ctrl.registerToken);
router.delete('/token', auth, ctrl.unregisterToken);

// Announcements (require family context)
router.get('/announcements', auth, resolveFamilyContext, ctrl.listAnnouncements);
router.post(
  '/announcements',
  auth,
  requireAdmin,
  resolveFamilyContext,
  ctrl.validateAnnouncement,
  ctrl.createAnnouncement
);
router.delete(
  '/announcements/:id',
  auth,
  requireAdmin,
  resolveFamilyContext,
  ctrl.deleteAnnouncement
);

module.exports = router;
