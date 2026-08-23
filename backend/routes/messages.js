const express = require('express');
const { auth } = require('../middleware/auth');
const { resolveFamilyContext } = require('../lib/familyAccess');
const messagesController = require('../controllers/messagesController');

const router = express.Router();

router.use(auth);
router.use(resolveFamilyContext);

router.get('/threads/unread-count', messagesController.unreadCount);
router.get('/threads', messagesController.listThreads);
router.post('/threads', messagesController.validateOpenThread, messagesController.openThread);
router.get(
  '/threads/:id/messages',
  messagesController.validateListMessages,
  messagesController.listMessages
);
router.post(
  '/threads/:id/messages',
  messagesController.validateSendMessage,
  messagesController.sendMessage
);
router.patch('/threads/:id/read', messagesController.validateThreadId, messagesController.markRead);
router.post('/threads/:id/clear', messagesController.validateThreadId, messagesController.clearThread);
router.delete(
  '/threads/:id/messages/:messageId',
  messagesController.validateMessageId,
  messagesController.deleteMessage
);

module.exports = router;
