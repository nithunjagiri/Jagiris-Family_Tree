import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

/**
 * Open the system share sheet. Falls back to clipboard if share is unavailable.
 * @returns {Promise<'shared' | 'copied' | 'cancelled'>}
 */
export async function sharePlainText(title, text) {
  const payload = { title: title || "Jagiri's Kutumbam", text: String(text || '') };
  try {
    if (Capacitor.isNativePlatform()) {
      await Share.share({ ...payload, dialogTitle: payload.title });
      return 'shared';
    }
  } catch (err) {
    if (err?.message && /cancel/i.test(String(err.message))) return 'cancelled';
  }
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share(payload);
      return 'shared';
    }
  } catch (err) {
    if (err?.name === 'AbortError') return 'cancelled';
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(payload.text);
      return 'copied';
    }
  } catch {
    /* ignore */
  }
  return 'cancelled';
}
