const express = require('express');
const { auth, requireAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const adminUsersController = require('../controllers/adminUsersController');

const router = express.Router();
router.use(auth, requireAdmin);

router.get('/audit-logs', adminController.listAuditLogs);

router.get('/users', adminUsersController.listUsers);
router.post('/users', adminUsersController.validateCreateUser, adminUsersController.createUser);
router.get('/users/:id', adminUsersController.getUser);
router.patch('/users/:id', adminUsersController.validatePatchUser, adminUsersController.patchUser);
router.post(
  '/users/:id/reset-password',
  adminUsersController.validateResetPassword,
  adminUsersController.resetUserPassword
);
router.post('/users/:id/deactivate', adminUsersController.deactivateUser);
router.post('/users/:id/activate', adminUsersController.activateUser);
router.post('/users/:id/approve-family-access', adminUsersController.approveFamilyAccess);

module.exports = router;
