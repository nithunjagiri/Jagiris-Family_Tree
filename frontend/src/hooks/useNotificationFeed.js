import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { notificationsApi } from '../services/api';

const POLL_MS = 30_000;

export function useNotificationFeed(enabled = true) {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const { data } = await notificationsApi.listFeed({ limit: 30 });
      if (!mountedRef.current) return;
      setItems(data.items || []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (_) {
      /* ignore poll errors */
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    let resumeListener;
    if (Capacitor.isNativePlatform()) {
      resumeListener = CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) refresh();
      });
    }
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      if (resumeListener) resumeListener.then((l) => l.remove());
    };
  }, [enabled, refresh]);

  const markRead = useCallback(async (id) => {
    try {
      await notificationsApi.markFeedRead(id);
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (_) {}
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notificationsApi.markAllFeedRead();
      setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
      setUnreadCount(0);
    } catch (_) {}
  }, []);

  return { items, unreadCount, loading, refresh, markRead, markAllRead };
}

export function formatNotificationTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}
