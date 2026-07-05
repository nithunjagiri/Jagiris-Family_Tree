import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { notificationsApi } from '../services/api';
import { getApiErrorMessage } from '../lib/apiErrorMessage';

const POLL_MS = 30_000;
const FEED_CHANGED_EVENT = 'jagiris:notifications-changed';

/** Notify all mounted feeds to refresh (e.g. after foreground push). */
export function requestNotificationFeedRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(FEED_CHANGED_EVENT));
  }
}

export function useNotificationFeed(enabled = true) {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const { data } = await notificationsApi.listFeed({ limit: 50 });
      if (!mountedRef.current) return;
      setItems(data.items || []);
      setUnreadCount(data.unreadCount ?? 0);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(getApiErrorMessage(err, 'Could not load notifications'));
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
    const onFeedChanged = () => refresh();
    window.addEventListener('focus', onFocus);
    window.addEventListener(FEED_CHANGED_EVENT, onFeedChanged);
    let resumeListener;
    if (Capacitor.isNativePlatform()) {
      resumeListener = CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) refresh();
      });
    }
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(FEED_CHANGED_EVENT, onFeedChanged);
      if (resumeListener) resumeListener.then((l) => l.remove());
    };
  }, [enabled, refresh]);

  const markRead = useCallback(async (id) => {
    try {
      await notificationsApi.markFeedRead(id);
      setItems((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read_at: n.read_at || new Date().toISOString() } : n
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not update notification'));
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notificationsApi.markAllFeedRead();
      setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
      setUnreadCount(0);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not mark notifications as read'));
    }
  }, []);

  return { items, unreadCount, loading, error, refresh, markRead, markAllRead };
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
