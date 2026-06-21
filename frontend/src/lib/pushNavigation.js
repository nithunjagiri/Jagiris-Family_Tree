/**
 * Navigate to the appropriate screen when the user taps a push notification.
 * Prefers server-provided linkPath; falls back to type-specific routes.
 * @param {object} notification Capacitor push notification payload
 */
export function navigateFromPushNotification(notification) {
  const data = notification?.data;
  if (!data || typeof data !== 'object') return;

  const linkPath = data.linkPath || data.link_path;
  if (linkPath && typeof linkPath === 'string') {
    window.location.href = linkPath.startsWith('/') ? linkPath : `/${linkPath}`;
    return;
  }

  switch (data.type) {
    case 'event':
    case 'event_added':
      window.location.href = '/events';
      break;
    case 'announcement':
      window.location.href = '/announcements';
      break;
    case 'birthday':
    case 'anniversary':
      if (data.memberId) {
        window.location.href = `/family-members/${data.memberId}`;
      } else {
        window.location.href = '/';
      }
      break;
    default:
      break;
  }
}
