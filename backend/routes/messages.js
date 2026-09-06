const express = require('express');
const { auth } = require('../middleware/auth');
const { resolveFamilyContext } = require('../lib/familyAccess');
const { requireApprovedFamilyAccess } = require('../middleware/requireApprovedFamilyAccess');
const { uploadChat } = require('../middleware/upload');
const messagesController = require('../controllers/messagesController');

const router = express.Router();

router.use(auth);
router.use(resolveFamilyContext);
router.use(requireApprovedFamilyAccess);

router.get('/threads/unread-count', messagesController.unreadCount);
router.get('/threads', messagesController.validateListThreads, messagesController.listThreads);
router.post('/threads', messagesController.validateOpenThread, messagesController.openThread);
router.get(
  '/threads/:id/messages',
  messagesController.validateListMessages,
  messagesController.listMessages
);
router.post(
  '/threads/:id/messages/images',
  uploadChat.array('images', 5),
  messagesController.validateSendMediaMessage,
  messagesController.sendMediaMessage
);
router.post(
  '/threads/:id/messages',
  messagesController.validateSendMessage,
  messagesController.sendMessage
);
router.patch('/threads/:id/read', messagesController.validateThreadId, messagesController.markRead);
router.post('/threads/:id/clear', messagesController.validateThreadId, messagesController.clearThread);
router.post('/threads/:id/delete-chat', messagesController.validateThreadId, messagesController.deleteChat);
router.post('/threads/:id/archive', messagesController.validateThreadId, messagesController.archiveThread);
router.post('/threads/:id/unarchive', messagesController.validateThreadId, messagesController.unarchiveThread);
router.delete(
  '/threads/:id/messages/:messageId',
  messagesController.validateMessageId,
  messagesController.deleteMessage
);
router.get(
  '/attachments/:attachmentId',
  messagesController.validateAttachmentId,
  messagesController.getAttachment
);

module.exports = router;
