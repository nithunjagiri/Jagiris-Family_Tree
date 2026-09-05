import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { accountApi, notificationsApi, resolveJagirisFamilyId, setActiveFamilyId } from '../services/api';
import {
  isPushSupported,
  initPushNotifications,
  getCurrentToken,
  teardownPushNotifications,
} from '../lib/pushNotifications';
import { navigateFromPushNotification } from '../lib/pushNavigation';
import { requestNotificationFeedRefresh } from '../hooks/useNotificationFeed';
import { disconnectChatSocket } from '../hooks/useChatSocket';

const AuthContext = createContext(null);

const TOKEN_KEY = 'jagiris_token';
const USER_KEY = 'jagiris_user';
const ACTIVE_FAMILY_KEY = 'jagiris_active_family_id';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const pushInitRef = useRef(false);

  const bootstrapActiveFamily = useCallback(async () => {
    try {
      const res = await accountApi.listFamilies();
      const rows = Array.isArray(res.data?.families) ? res.data.families : [];
      const nextId = resolveJagirisFamilyId(rows);
      if (nextId) setActiveFamilyId(nextId);
    } catch (_) {
      /* keep existing localStorage family id if refresh fails */
    }
  }, []);

  const registerPush = useCallback(async () => {
    if (!isPushSupported() || pushInitRef.current) return;
    pushInitRef.current = true;
    try {
      await initPushNotifications(
        async (deviceToken) => {
          try {
            await notificationsApi.registerToken(deviceToken);
          } catch (err) {
            console.error('[push] Failed to send token to backend:', err);
          }
        },
        (notification) => {
          navigateFromPushNotification(notification);
        }
      );
    } catch (err) {
      console.error('[push] init error:', err);
    }
  }, []);

  const unregisterPush = useCallback(async () => {
    if (!isPushSupported()) return;
    const deviceToken = getCurrentToken();
    if (deviceToken) {
      try {
        await notificationsApi.unregisterToken(deviceToken);
      } catch (_) {}
    }
    await teardownPushNotifications();
    pushInitRef.current = false;
  }, []);

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    const u = localStorage.getItem(USER_KEY);
    if (t && u) {
      setToken(t);
      try {
        const parsed = JSON.parse(u);
        setUser(parsed);
        accountApi
          .getPrivacySettings()
          .then((res) => {
            const profileUser = res.data?.user;
            if (!profileUser) return;
            const updated = { ...parsed, profile_photo: profileUser.profile_photo ?? null };
            setUser(updated);
            localStorage.setItem(USER_KEY, JSON.stringify(updated));
          })
          .catch(() => {});
      } catch (_) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setLoading(false);
  }, []);

  // Register for push when authenticated
  useEffect(() => {
    if (token && user) {
      registerPush();
    }
  }, [token, user, registerPush]);

  // Resolve active family before module pages fetch scoped data
  useEffect(() => {
    if (!token || !user?.id) return;
    bootstrapActiveFamily();
  }, [token, user?.id, bootstrapActiveFamily]);

  const login = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    bootstrapActiveFamily();
  };

  const logout = async () => {
    await unregisterPush();
    disconnectChatSocket();
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ACTIVE_FAMILY_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, isAuth: !!token, isAdmin: user?.isAdmin === true }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
