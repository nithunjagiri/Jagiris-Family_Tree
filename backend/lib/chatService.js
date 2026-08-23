const db = require('../database/db');
const { sendToUsers } = require('./fcmSender');
const chatPresence = require('./chatPresence');

const MAX_BODY_LENGTH = 2000;
const DEFAULT_MESSAGE_LIMIT = 50;
const MAX_MESSAGE_LIMIT = 100;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function mapMessageRow(row) {
  const deleted = !!row.deleted_at;
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_user_id: row.sender_user_id,
    body: deleted ? null : row.body,
    created_at: row.created_at,
    delivered_at: row.delivered_at,
    deleted_at: row.deleted_at,
    is_deleted: deleted,
  };
}

async function refreshConversationPreview(conversationId) {
  const r = await db.query(
    `SELECT body, created_at FROM messages
     WHERE conversation_id = $1::integer AND deleted_at IS NULL
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [Number(conversationId)]
  );
  const latest = r.rows[0];
  await db.query(
    `UPDATE conversations
     SET last_message_at = $1, last_message_preview = $2
     WHERE id = $3::integer`,
    [latest?.created_at ?? null, latest ? trimPreview(latest.body) : null, Number(conversationId)]
  );
}

const MESSAGE_VISIBILITY_SQL = `
  (cm.cleared_at IS NULL OR m.created_at > cm.cleared_at)
`;

function trimPreview(body, max = 120) {
  const s = String(body || '').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

/** Display name: linked family member name, then user name, then username. */
const DISPLAY_NAME_SQL = `
  COALESCE(
    NULLIF(TRIM(CONCAT(fm.name, ' ', COALESCE(fm.surname, ''))), ''),
    NULLIF(TRIM(CONCAT(u.first_name, ' ', COALESCE(u.last_name, ''))), ''),
    u.username
  )
`;

async function assertUserInFamily(userId, familyId) {
  const r = await db.query(
    'SELECT 1 FROM family_memberships WHERE user_id = $1::integer AND family_id = $2::integer',
    [Number(userId), Number(familyId)]
  );
  if (!r.rows[0]) throw httpError(403, 'User is not a member of this family');
}

async function assertUserActive(userId) {
  const r = await db.query(
    'SELECT COALESCE(is_active, true) AS a FROM users WHERE id = $1::integer',
    [Number(userId)]
  );
  if (!r.rows[0] || r.rows[0].a === false) throw httpError(403, 'User account is inactive');
}

async function assertConversationParticipant(conversationId, userId) {
  const r = await db.query(
    `SELECT cm.conversation_id, c.family_id
     FROM conversation_members cm
     JOIN conversations c ON c.id = cm.conversation_id
     WHERE cm.conversation_id = $1::integer AND cm.user_id = $2::integer`,
    [Number(conversationId), Number(userId)]
  );
  if (!r.rows[0]) throw httpError(404, 'Conversation not found');
  return r.rows[0];
}

async function resolveLinkedRecipientUserId(familyMemberId, familyId) {
  const r = await db.query(
    `SELECT linked_user_id FROM family_members
     WHERE id = $1::integer AND family_id = $2::integer`,
    [Number(familyMemberId), Number(familyId)]
  );
  if (!r.rows[0]) throw httpError(404, 'Family member not found');
  const linked = r.rows[0].linked_user_id;
  if (!linked) throw httpError(400, 'This family member is not linked to an app account');
  return Number(linked);
}

async function findDirectConversationId(familyId, userIdA, userIdB) {
  const r = await db.query(
    `SELECT c.id
     FROM conversations c
     INNER JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = $1::integer
     INNER JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = $2::integer
     WHERE c.family_id = $3::integer
     LIMIT 1`,
    [Number(userIdA), Number(userIdB), Number(familyId)]
  );
  return r.rows[0]?.id ?? null;
}

async function createDirectConversation(familyId, userIdA, userIdB) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const conv = await client.query(
      'INSERT INTO conversations (family_id) VALUES ($1::integer) RETURNING id',
      [Number(familyId)]
    );
    const conversationId = conv.rows[0].id;
    await client.query(
      `INSERT INTO conversation_members (conversation_id, user_id)
       VALUES ($1::integer, $2::integer), ($1::integer, $3::integer)`,
      [conversationId, Number(userIdA), Number(userIdB)]
    );
    await client.query('COMMIT');
    return conversationId;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
}

async function getOrCreateDirectConversation(familyId, userIdA, userIdB) {
  const existing = await findDirectConversationId(familyId, userIdA, userIdB);
  if (existing) return existing;
  return createDirectConversation(familyId, userIdA, userIdB);
}

async function getOtherParticipantId(conversationId, userId) {
  const r = await db.query(
    `SELECT user_id FROM conversation_members
     WHERE conversation_id = $1::integer AND user_id <> $2::integer
     LIMIT 1`,
    [Number(conversationId), Number(userId)]
  );
  return r.rows[0]?.user_id ?? null;
}

function mapParticipantRow(row) {
  return {
    user_id: row.user_id,
    display_name: row.display_name,
    profile_photo: row.profile_photo ?? null,
    username: row.username,
  };
}

async function loadParticipantProfiles(familyId, userIds) {
  if (!userIds.length) return [];
  const r = await db.query(
    `SELECT DISTINCT ON (u.id)
       u.id AS user_id,
       u.username,
       u.profile_photo,
       ${DISPLAY_NAME_SQL} AS display_name
     FROM users u
     LEFT JOIN family_members fm ON fm.linked_user_id = u.id AND fm.family_id = $1::integer
     WHERE u.id = ANY($2::int[])
     ORDER BY u.id`,
    [Number(familyId), userIds.map(Number)]
  );
  return r.rows.map(mapParticipantRow);
}

async function listThreads(userId, familyId) {
  await assertUserInFamily(userId, familyId);
  const r = await db.query(
    `SELECT
       c.id,
       c.family_id,
       c.last_message_at,
       cm.last_read_at,
       cm.cleared_at,
       (
         SELECT m.body FROM messages m
         WHERE m.conversation_id = c.id
           AND m.deleted_at IS NULL
           AND (cm.cleared_at IS NULL OR m.created_at > cm.cleared_at)
         ORDER BY m.created_at DESC, m.id DESC
         LIMIT 1
       ) AS last_message_preview,
       (
         SELECT COUNT(*)::int FROM messages m
         WHERE m.conversation_id = c.id
           AND m.sender_user_id <> $1::integer
           AND m.deleted_at IS NULL
           AND (cm.cleared_at IS NULL OR m.created_at > cm.cleared_at)
           AND (cm.last_read_at IS NULL OR m.created_at > cm.last_read_at)
       ) AS unread_count
     FROM conversations c
     INNER JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = $1::integer
     WHERE c.family_id = $2::integer
     ORDER BY COALESCE(
       (SELECT MAX(m2.created_at) FROM messages m2
        WHERE m2.conversation_id = c.id AND m2.deleted_at IS NULL
          AND (cm.cleared_at IS NULL OR m2.created_at > cm.cleared_at)),
       c.created_at
     ) DESC`,
    [Number(userId), Number(familyId)]
  );

  const threads = [];
  for (const row of r.rows) {
    const otherId = await getOtherParticipantId(row.id, userId);
    const [other] = otherId ? await loadParticipantProfiles(familyId, [otherId]) : [];
    threads.push({
      id: row.id,
      family_id: row.family_id,
      last_message_at: row.last_message_at,
      last_message_preview: row.last_message_preview,
      last_read_at: row.last_read_at,
      unread_count: row.unread_count,
      other_participant: other || null,
    });
  }
  return threads;
}

async function openThread({ userId, familyId, recipientUserId, familyMemberId }) {
  await assertUserInFamily(userId, familyId);
  await assertUserActive(userId);

  let recipientId = recipientUserId != null ? Number(recipientUserId) : null;
  if (familyMemberId != null) {
    recipientId = await resolveLinkedRecipientUserId(familyMemberId, familyId);
  }
  if (!recipientId || !Number.isInteger(recipientId)) {
    throw httpError(400, 'recipientUserId or familyMemberId is required');
  }
  if (recipientId === Number(userId)) throw httpError(400, 'You cannot message yourself');

  await assertUserInFamily(recipientId, familyId);
  await assertUserActive(recipientId);

  const conversationId = await getOrCreateDirectConversation(familyId, userId, recipientId);
  const [other] = await loadParticipantProfiles(familyId, [recipientId]);
  return { id: conversationId, other_participant: other || null };
}

async function listMessages(conversationId, userId, familyId, { before, limit } = {}) {
  const conv = await assertConversationParticipant(conversationId, userId);
  if (Number(conv.family_id) !== Number(familyId)) throw httpError(403, 'Conversation not in active family');

  const pageSize = Math.min(Math.max(Number(limit) || DEFAULT_MESSAGE_LIMIT, 1), MAX_MESSAGE_LIMIT);
  const params = [Number(conversationId), Number(userId)];
  let beforeClause = '';
  if (before) {
    params.push(Number(before));
    beforeClause = 'AND m.id < $3::integer';
  }
  params.push(pageSize);
  const limitParam = `$${params.length}`;

  const r = await db.query(
    `SELECT m.id, m.conversation_id, m.sender_user_id, m.body, m.created_at, m.delivered_at, m.deleted_at
     FROM messages m
     INNER JOIN conversation_members cm ON cm.conversation_id = m.conversation_id AND cm.user_id = $2::integer
     WHERE m.conversation_id = $1::integer
       AND ${MESSAGE_VISIBILITY_SQL}
       ${beforeClause}
     ORDER BY m.created_at DESC, m.id DESC
     LIMIT ${limitParam}::integer`,
    params
  );

  return {
    messages: r.rows.reverse().map(mapMessageRow),
    has_more: r.rows.length === pageSize,
  };
}

async function upsertChatInAppNotification({
  recipientUserId,
  familyId,
  conversationId,
  senderUserId,
  title,
  body,
}) {
  const referenceKey = `chat_thread_${conversationId}`;
  const existing = await db.query(
    `SELECT id FROM user_notifications
     WHERE user_id = $1::integer AND type = 'chat_message' AND reference_key = $2 AND read_at IS NULL
     LIMIT 1`,
    [Number(recipientUserId), referenceKey]
  );
  if (existing.rows[0]) {
    await db.query(
      `UPDATE user_notifications
       SET title = $1, body = $2, created_at = NOW(), actor_user_id = $3
       WHERE id = $4`,
      [title, body, Number(senderUserId), existing.rows[0].id]
    );
    return;
  }
  await db.query(
    `INSERT INTO user_notifications (
       user_id, family_id, type, title, body,
       entity_type, entity_id, link_path, actor_user_id, reference_key
     ) VALUES ($1, $2, 'chat_message', $3, $4, 'chat_thread', $5, $6, $7, $8)`,
    [
      Number(recipientUserId),
      Number(familyId),
      title,
      body,
      Number(conversationId),
      `/messages/${conversationId}`,
      Number(senderUserId),
      referenceKey,
    ]
  );
}

async function notifyRecipient({ recipientId, senderId, familyId, conversationId, body, senderName }) {
  if (chatPresence.isUserViewingThread(recipientId, conversationId)) return;

  const preview = trimPreview(body);
  const title = `Message from ${senderName}`;
  await upsertChatInAppNotification({
    recipientUserId: recipientId,
    familyId,
    conversationId,
    senderUserId: senderId,
    title,
    body: preview,
  });

  if (!chatPresence.isUserOnline(recipientId)) {
    const referenceKey = `chat_push_${conversationId}_${Date.now()}`;
    sendToUsers(
      [recipientId],
      'chat_message',
      referenceKey,
      title,
      preview,
      { type: 'chat_message', threadId: String(conversationId), linkPath: `/messages/${conversationId}` }
    ).catch((err) => console.error('[chat] push error:', err.message));
  }
}

async function sendMessage(conversationId, userId, familyId, body, emitFn) {
  const conv = await assertConversationParticipant(conversationId, userId);
  if (Number(conv.family_id) !== Number(familyId)) throw httpError(403, 'Conversation not in active family');
  await assertUserActive(userId);

  const text = String(body || '').trim();
  if (!text) throw httpError(400, 'Message cannot be empty');
  if (text.length > MAX_BODY_LENGTH) throw httpError(400, `Message must be at most ${MAX_BODY_LENGTH} characters`);

  const recipientId = await getOtherParticipantId(conversationId, userId);
  if (recipientId) await assertUserActive(recipientId);

  const client = await db.connect();
  let message;
  try {
    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO messages (conversation_id, sender_user_id, body, delivered_at)
       VALUES ($1::integer, $2::integer, $3, NOW())
       RETURNING id, conversation_id, sender_user_id, body, created_at, delivered_at`,
      [Number(conversationId), Number(userId), text]
    );
    message = inserted.rows[0];
    await client.query(
      `UPDATE conversations
       SET last_message_at = $1, last_message_preview = $2
       WHERE id = $3::integer`,
      [message.created_at, trimPreview(text), Number(conversationId)]
    );
    await client.query('COMMIT');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
    throw err;
  } finally {
    client.release();
  }

  const [senderProfile] = await loadParticipantProfiles(familyId, [userId]);
  const payload = {
    ...mapMessageRow(message),
    sender_display_name: senderProfile?.display_name || null,
  };

  if (typeof emitFn === 'function') {
    emitFn(payload, [userId, recipientId].filter(Boolean));
  }

  if (recipientId) {
    notifyRecipient({
      recipientId,
      senderId: userId,
      familyId,
      conversationId,
      body: text,
      senderName: senderProfile?.display_name || 'Someone',
    }).catch((err) => console.error('[chat] notify error:', err.message));
  }

  return payload;
}

async function markThreadRead(conversationId, userId, familyId) {
  const conv = await assertConversationParticipant(conversationId, userId);
  if (Number(conv.family_id) !== Number(familyId)) throw httpError(403, 'Conversation not in active family');
  await db.query(
    `UPDATE conversation_members
     SET last_read_at = NOW()
     WHERE conversation_id = $1::integer AND user_id = $2::integer`,
    [Number(conversationId), Number(userId)]
  );
  return { ok: true };
}

async function getUnreadThreadCount(userId, familyId) {
  const r = await db.query(
    `SELECT COUNT(*)::int AS c
     FROM conversations c
     INNER JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = $1::integer
     WHERE c.family_id = $2::integer
       AND EXISTS (
         SELECT 1 FROM messages m
         WHERE m.conversation_id = c.id
           AND m.sender_user_id <> $1::integer
           AND m.deleted_at IS NULL
           AND (cm.cleared_at IS NULL OR m.created_at > cm.cleared_at)
           AND (cm.last_read_at IS NULL OR m.created_at > cm.last_read_at)
       )`,
    [Number(userId), Number(familyId)]
  );
  return r.rows[0]?.c ?? 0;
}

async function deleteMessage(conversationId, messageId, userId, familyId, emitFn) {
  const conv = await assertConversationParticipant(conversationId, userId);
  if (Number(conv.family_id) !== Number(familyId)) throw httpError(403, 'Conversation not in active family');

  const r = await db.query(
    `SELECT id, sender_user_id, deleted_at FROM messages
     WHERE id = $1::integer AND conversation_id = $2::integer`,
    [Number(messageId), Number(conversationId)]
  );
  const row = r.rows[0];
  if (!row) throw httpError(404, 'Message not found');
  if (row.deleted_at) throw httpError(400, 'Message already deleted');
  if (Number(row.sender_user_id) !== Number(userId)) {
    throw httpError(403, 'You can only delete your own messages');
  }

  const updated = await db.query(
    `UPDATE messages SET deleted_at = NOW()
     WHERE id = $1::integer
     RETURNING id, conversation_id, sender_user_id, body, created_at, delivered_at, deleted_at`,
    [Number(messageId)]
  );
  await refreshConversationPreview(conversationId);
  const payload = mapMessageRow(updated.rows[0]);
  const recipientId = await getOtherParticipantId(conversationId, userId);
  if (typeof emitFn === 'function') {
    emitFn(payload, [userId, recipientId].filter(Boolean));
  }
  return payload;
}

async function clearThread(conversationId, userId, familyId) {
  const conv = await assertConversationParticipant(conversationId, userId);
  if (Number(conv.family_id) !== Number(familyId)) throw httpError(403, 'Conversation not in active family');

  await db.query(
    `UPDATE conversation_members
     SET cleared_at = NOW(), last_read_at = NOW()
     WHERE conversation_id = $1::integer AND user_id = $2::integer`,
    [Number(conversationId), Number(userId)]
  );
  return { ok: true };
}

async function listLinkableUsers(familyId, excludeMemberId = null) {
  const r = await db.query(
    `SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.profile_photo,
            fm.id AS linked_member_id,
            COALESCE(
              NULLIF(TRIM(CONCAT(fm_link.name, ' ', COALESCE(fm_link.surname, ''))), ''),
              NULLIF(TRIM(CONCAT(u.first_name, ' ', COALESCE(u.last_name, ''))), ''),
              u.username
            ) AS display_name
     FROM family_memberships mem
     JOIN users u ON u.id = mem.user_id
     LEFT JOIN family_members fm ON fm.linked_user_id = u.id AND fm.family_id = mem.family_id
     LEFT JOIN family_members fm_link ON fm_link.linked_user_id = u.id AND fm_link.family_id = mem.family_id
     WHERE mem.family_id = $1::integer
       AND COALESCE(u.is_active, true) = true
     ORDER BY u.username`,
    [Number(familyId)]
  );
  return r.rows
    .filter((row) => {
      if (!excludeMemberId) return true;
      if (!row.linked_member_id) return true;
      return Number(row.linked_member_id) === Number(excludeMemberId);
    })
    .map((row) => ({
      id: row.id,
      username: row.username,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      profile_photo: row.profile_photo,
      linked_member_id: row.linked_member_id,
      display_name: row.display_name,
      is_available: !row.linked_member_id || Number(row.linked_member_id) === Number(excludeMemberId),
    }));
}

module.exports = {
  MAX_BODY_LENGTH,
  DEFAULT_MESSAGE_LIMIT,
  assertUserInFamily,
  listThreads,
  openThread,
  listMessages,
  sendMessage,
  markThreadRead,
  getUnreadThreadCount,
  deleteMessage,
  clearThread,
  listLinkableUsers,
  resolveLinkedRecipientUserId,
};
