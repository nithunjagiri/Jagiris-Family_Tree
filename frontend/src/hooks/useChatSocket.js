import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { getSocketUrl } from '../lib/backendOrigin';

let sharedSocket = null;
let sharedToken = null;
const listeners = new Map();

function getSocket(token) {
  if (sharedSocket && sharedToken === token) return sharedSocket;
  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
  }
  if (!token) return null;
  sharedToken = token;
  sharedSocket = io(getSocketUrl(), {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });
  sharedSocket.on('message:new', (payload) => {
    const set = listeners.get('message:new');
    if (set) set.forEach((fn) => fn(payload));
  });
  sharedSocket.on('message:deleted', (payload) => {
    const set = listeners.get('message:deleted');
    if (set) set.forEach((fn) => fn(payload));
  });
  sharedSocket.on('thread:read', (payload) => {
    const set = listeners.get('thread:read');
    if (set) set.forEach((fn) => fn(payload));
  });
  return sharedSocket;
}

export function disconnectChatSocket() {
  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
    sharedToken = null;
  }
}

export function useChatSocket({
  enabled = true,
  threadId = null,
  onMessage,
  onMessageDeleted,
  onThreadRead,
} = {}) {
  const onMessageRef = useRef(onMessage);
  const onDeletedRef = useRef(onMessageDeleted);
  const onThreadReadRef = useRef(onThreadRead);
  onMessageRef.current = onMessage;
  onDeletedRef.current = onMessageDeleted;
  onThreadReadRef.current = onThreadRead;

  const subscribe = useCallback((event, handler) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
    return () => listeners.get(event)?.delete(handler);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    const token = localStorage.getItem('jagiris_token');
    if (!token) return undefined;
    const socket = getSocket(token);
    if (!socket) return undefined;

    const unsubNew = subscribe('message:new', (payload) => {
      onMessageRef.current?.(payload);
    });
    const unsubDeleted = subscribe('message:deleted', (payload) => {
      onDeletedRef.current?.(payload);
    });
    const unsubRead = subscribe('thread:read', (payload) => {
      onThreadReadRef.current?.(payload);
    });
    return () => {
      unsubNew();
      unsubDeleted();
      unsubRead();
    };
  }, [enabled, subscribe]);

  useEffect(() => {
    if (!enabled) return undefined;
    const token = localStorage.getItem('jagiris_token');
    const socket = token ? getSocket(token) : null;
    if (!socket) return undefined;

    const join = () => {
      if (threadId) socket.emit('thread:join', { threadId: Number(threadId) });
      else socket.emit('thread:leave');
    };

    if (socket.connected) join();
    socket.on('connect', join);
    return () => {
      socket.off('connect', join);
      socket.emit('thread:leave');
    };
  }, [enabled, threadId]);

  return { socket: enabled ? getSocket(localStorage.getItem('jagiris_token')) : null };
}
