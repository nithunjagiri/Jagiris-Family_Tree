/** In-memory presence for chat: online users and active thread views. */

const onlineSockets = new Map(); // userId -> Set<socketId>
const activeThreads = new Map(); // userId -> conversationId

function addSocket(userId, socketId) {
  const uid = Number(userId);
  if (!onlineSockets.has(uid)) onlineSockets.set(uid, new Set());
  onlineSockets.get(uid).add(socketId);
}

function removeSocket(userId, socketId) {
  const uid = Number(userId);
  const set = onlineSockets.get(uid);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) {
    onlineSockets.delete(uid);
    activeThreads.delete(uid);
  }
}

function setActiveThread(userId, conversationId) {
  const uid = Number(userId);
  if (conversationId == null) {
    activeThreads.delete(uid);
    return;
  }
  activeThreads.set(uid, Number(conversationId));
}

function isUserOnline(userId) {
  const set = onlineSockets.get(Number(userId));
  return !!set && set.size > 0;
}

function isUserViewingThread(userId, conversationId) {
  return activeThreads.get(Number(userId)) === Number(conversationId);
}

module.exports = {
  addSocket,
  removeSocket,
  setActiveThread,
  isUserOnline,
  isUserViewingThread,
};
