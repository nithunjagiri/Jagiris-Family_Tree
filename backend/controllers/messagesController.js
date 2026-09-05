const { validationResult, body, param, query } = require('express-validator');
const chatService = require('../lib/chatService');
const { allowSend } = require('../lib/chatRateLimit');
const { emitToUsers } = require('../lib/socketServer');
const { MAX_IMAGES_PER_SEND } = require('../lib/chatMediaConstants');

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  return null;
}

function parseMetadataArrays(req) {
  const raw = req.body || {};
  const widths = Array.isArray(raw.width) ? raw.width : raw.width != null ? [raw.width] : [];
  const heights = Array.isArray(raw.height) ? raw.height : raw.height != null ? [raw.height] : [];
  const sizes = Array.isArray(raw.byte_size) ? raw.byte_size : raw.byte_size != null ? [raw.byte_size] : [];
  const files = req.files || [];
  return files.map((_, index) => ({
    width: widths[index] != null ? Number(widths[index]) : null,
    height: heights[index] != null ? Number(heights[index]) : null,
    byteSize: sizes[index] != null ? Number(sizes[index]) : null,
  }));
}

exports.validateOpenThread = [
  body('recipientUserId').optional().isInt({ min: 1 }).toInt(),
  body('familyMemberId').optional().isInt({ min: 1 }).toInt(),
];

exports.validateSendMessage = [
  param('id').isInt({ min: 1 }).toInt(),
  body('body').trim().notEmpty().withMessage('Message body required'),
];

exports.validateSendMediaMessage = [
  param('id').isInt({ min: 1 }).toInt(),
  body('body').optional().trim().isLength({ max: 2000 }).withMessage('Caption too long'),
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

exports.validateAttachmentId = [param('attachmentId').isInt({ min: 1 }).toInt()];

exports.validateListThreads = [
  query('archived').optional().isIn(['0', '1', 'true', 'false']),
];

exports.listThreads = async (req, res, next) => {
  try {
    const v = handleValidation(req, res);
    if (v) return v;
    const archivedRaw = req.query.archived;
    const archived =
      archivedRaw === '1' || archivedRaw === 'true' || archivedRaw === true;
    const threads = await chatService.listThreads(req.user.id, req.familyId, { archived });
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

exports.sendMediaMessage = async (req, res, next) => {
  try {
    const v = handleValidation(req, res);
    if (v) return v;
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: 'At least one image is required' });
    }
    if (files.length > MAX_IMAGES_PER_SEND) {
      return res.status(400).json({ error: `Maximum ${MAX_IMAGES_PER_SEND} images per message` });
    }
    if (!allowSend(req.user.id)) {
      return res.status(429).json({ error: 'Too many messages. Please wait a moment.' });
    }
    const message = await chatService.sendMediaMessage(
      req.params.id,
      req.user.id,
      req.familyId,
      {
        caption: req.body?.body,
        files,
        metadata: parseMetadataArrays(req),
      },
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
    const otherId = await chatService.getOtherParticipantId(req.params.id, req.user.id);
    if (otherId && result.last_read_at) {
      emitToUsers([otherId], 'thread:read', {
        conversation_id: Number(req.params.id),
        user_id: req.user.id,
        last_read_at: result.last_read_at,
      });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.getAttachment = async (req, res, next) => {
  try {
    const v = handleValidation(req, res);
    if (v) return v;
    const result = await chatService.getAttachmentForUser(
      req.params.attachmentId,
      req.user.id,
      req.familyId
    );
    if (result.type === 'redirect') {
      return res.redirect(result.url);
    }
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    const stream = require('fs').createReadStream(result.path);
    stream.on('error', (err) => next(err));
    stream.pipe(res);
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

exports.deleteChat = async (req, res, next) => {
  try {
    const v = handleValidation(req, res);
    if (v) return v;
    const result = await chatService.deleteChatFromInbox(req.params.id, req.user.id, req.familyId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.archiveThread = async (req, res, next) => {
  try {
    const v = handleValidation(req, res);
    if (v) return v;
    const result = await chatService.archiveThread(req.params.id, req.user.id, req.familyId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.unarchiveThread = async (req, res, next) => {
  try {
    const v = handleValidation(req, res);
    if (v) return v;
    const result = await chatService.unarchiveThread(req.params.id, req.user.id, req.familyId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
