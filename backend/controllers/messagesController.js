const { validationResult, body, param, query } = require('express-validator');
const chatService = require('../lib/chatService');
const { allowSend } = require('../lib/chatRateLimit');
const { emitToUsers } = require('../lib/socketServer');

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  return null;
}

exports.validateOpenThread = [
  body('recipientUserId').optional().isInt({ min: 1 }).toInt(),
  body('familyMemberId').optional().isInt({ min: 1 }).toInt(),
];

exports.validateSendMessage = [
  param('id').isInt({ min: 1 }).toInt(),
  body('body').trim().notEmpty().withMessage('Message body required'),
];

exports.validateListMessages = [
  param('id').isInt({ min: 1 }).toInt(),
  query('before').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

exports.validateThreadId = [param('id').isInt({ min: 1 }).toInt()];

exports.validateMessageId = [
  param('id').isInt({ min: 1 }).toInt(),
  param('messageId').isInt({ min: 1 }).toInt(),
];

exports.listThreads = async (req, res, next) => {
  try {
    const threads = await chatService.listThreads(req.user.id, req.familyId);
    res.json({ threads });
  } catch (err) {
    next(err);
  }
};

exports.openThread = async (req, res, next) => {
  try {
    const v = handleValidation(req, res);
    if (v) return v;
    const { recipientUserId, familyMemberId } = req.body;
    if (!recipientUserId && !familyMemberId) {
      return res.status(400).json({ error: 'recipientUserId or familyMemberId is required' });
    }
    const thread = await chatService.openThread({
      userId: req.user.id,
      familyId: req.familyId,
      recipientUserId,
      familyMemberId,
    });
    res.json(thread);
  } catch (err) {
    next(err);
  }
};

exports.listMessages = async (req, res, next) => {
  try {
    const v = handleValidation(req, res);
    if (v) return v;
    const result = await chatService.listMessages(req.params.id, req.user.id, req.familyId, {
      before: req.query.before,
      limit: req.query.limit,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const v = handleValidation(req, res);
    if (v) return v;
    if (!allowSend(req.user.id)) {
      return res.status(429).json({ error: 'Too many messages. Please wait a moment.' });
    }
    const message = await chatService.sendMessage(
      req.params.id,
      req.user.id,
      req.familyId,
      req.body.body,
      (payload, userIds) => {
        emitToUsers(userIds, 'message:new', {
          conversation_id: payload.conversation_id,
          message: payload,
        });
      }
    );
    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    const v = handleValidation(req, res);
    if (v) return v;
    const result = await chatService.markThreadRead(req.params.id, req.user.id, req.familyId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.unreadCount = async (req, res, next) => {
  try {
    const count = await chatService.getUnreadThreadCount(req.user.id, req.familyId);
    res.json({ unread_count: count });
  } catch (err) {
    next(err);
  }
};

exports.deleteMessage = async (req, res, next) => {
  try {
    const v = handleValidation(req, res);
    if (v) return v;
    const message = await chatService.deleteMessage(
      req.params.id,
      req.params.messageId,
      req.user.id,
      req.familyId,
      (payload, userIds) => {
        emitToUsers(userIds, 'message:deleted', {
          conversation_id: payload.conversation_id,
          message: payload,
        });
      }
    );
    res.json({ message });
  } catch (err) {
    next(err);
  }
};

exports.clearThread = async (req, res, next) => {
  try {
    const v = handleValidation(req, res);
    if (v) return v;
    const result = await chatService.clearThread(req.params.id, req.user.id, req.familyId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
