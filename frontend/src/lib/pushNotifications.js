import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

let registered = false;
let currentToken = null;

/**
 * Push is opt-in until Firebase is configured (google-services.json + backend FCM env).
 * Without this, PushNotifications.register() crashes Android natively.
 */
export function isPushEnabled() {
  return import.meta.env.VITE_ENABLE_PUSH === 'true';
}

/**
 * Returns true when running on a native platform that supports push.
 */
export function isPushSupported() {
  return Capacitor.isNativePlatform() && isPushEnabled();
}

/**
 * Request push notification permissions and register for FCM.
 * @param {(token: string) => Promise<void>} onTokenReceived
 *   Callback invoked with the device token (should POST it to backend).
 * @param {(notification: object) => void} [onNotificationTapped]
 *   Callback when user taps a notification.
 */
export async function initPushNotifications(onTokenReceived, onNotificationTapped) {
  if (!isPushSupported()) return;
  if (registered) return;

  let permStatus = await PushNotifications.checkPermissions();
  if (permStatus.receive === 'prompt') {
    permStatus = await PushNotifications.requestPermissions();
  }
  if (permStatus.receive !== 'granted') {
    console.warn('[push] Permission not granted');
    return;
  }

  if (Capacitor.getPlatform() === 'android') {
    await PushNotifications.createChannel({
      id: 'jagiris_notifications',
      name: 'Jagiris Notifications',
      description: 'Family announcements, birthdays, anniversaries, and events',
      importance: 5,
      visibility: 1,
      sound: 'default',
    });
  }

  PushNotifications.addListener('registration', async (token) => {
    currentToken = token.value;
    try {
      await onTokenReceived(token.value);
    } catch (err) {
      console.error('[push] token registration callback error:', err);
    }
  });

  PushNotifications.addListener('registrationError', (err) => {
    console.error('[push] Registration error:', err);
  });

  PushNotifications.addListener('pushNotificationReceived', () => {
    requestNotificationFeedRefresh();
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    if (onNotificationTapped) {
      onNotificationTapped(action.notification);
    }
  });

  await PushNotifications.register();
  registered = true;
}

/**
 * Returns the most recently received FCM token, or null.
 */
export function getCurrentToken() {
  return currentToken;
}

/**
 * Remove all listeners and reset state (for logout).
 */
export async function teardownPushNotifications() {
  if (!isPushSupported()) return;
  try {
    await PushNotifications.removeAllListeners();
  } catch (_) {}
  registered = false;
  currentToken = null;
}
