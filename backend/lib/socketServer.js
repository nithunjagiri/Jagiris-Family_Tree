const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const chatPresence = require('./chatPresence');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

let io = null;

function parseAllowedOrigins() {
  const raw = process.env.CORS_ORIGINS || process.env.FRONTEND_ORIGIN || '';
  const fromEnv = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (fromEnv.length > 0) return fromEnv;
  return true;
}

function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: parseAllowedOrigins(),
      credentials: true,
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(String(token), JWT_SECRET);
      const userId = Number(decoded.id);
      if (!Number.isInteger(userId) || userId <= 0) return next(new Error('Invalid token'));
      socket.userId = userId;
      socket.username = decoded.username;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    chatPresence.addSocket(userId, socket.id);
    socket.join(`user:${userId}`);

    socket.on('thread:join', ({ threadId } = {}) => {
      if (threadId != null) chatPresence.setActiveThread(userId, threadId);
    });

    socket.on('thread:leave', () => {
      chatPresence.setActiveThread(userId, null);
    });

    socket.on('disconnect', () => {
      chatPresence.removeSocket(userId, socket.id);
    });
  });

  return io;
}

function getIo() {
  return io;
}

function emitToUsers(userIds, event, payload) {
  if (!io) return;
  const ids = [...new Set((userIds || []).map(Number).filter((n) => n > 0))];
  for (const uid of ids) {
    io.to(`user:${uid}`).emit(event, payload);
  }
}

module.exports = { initSocketServer, getIo, emitToUsers };
