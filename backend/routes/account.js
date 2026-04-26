const express = require('express');
const { auth } = require('../middleware/auth');
const accountController = require('../controllers/accountController');
const { resolveFamilyContext } = require('../lib/familyAccess');

const router = express.Router();
//router.use(auth);// disable after deploy
router.use(resolveFamilyContext);

router.get('/privacy', accountController.getPrivacySettings);
router.patch('/profile', accountController.validateProfilePatch, accountController.patchProfile);
router.patch('/privacy', accountController.validatePrivacyPatch, accountController.patchPrivacySettings);
router.post('/change-password', accountController.validateChangePassword, accountController.changePassword);
router.get('/export', accountController.exportData);
router.get('/families', accountController.listFamilies);
router.post('/delete-account', accountController.validateDeleteAccount, accountController.deleteAccount);

module.exports = router;
