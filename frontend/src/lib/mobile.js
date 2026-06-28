import { Capacitor } from '@capacitor/core';

/** True when running inside the Capacitor Android/iOS shell. */
export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

/** Compact viewport (phone) — used for mobile-only UI defaults. */
export function isCompactViewport() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 639px)').matches;
}

/** Apply document classes once at startup (safe-area, native shell). */
export function initMobileShell() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (isNativeApp()) {
    root.classList.add('native-app');
  }
  if (isCompactViewport()) {
    root.classList.add('compact-viewport');
  }
  const mq = window.matchMedia('(max-width: 639px)');
  const onChange = () => {
    root.classList.toggle('compact-viewport', mq.matches);
  };
  if (mq.addEventListener) mq.addEventListener('change', onChange);
  else mq.addListener(onChange);
}
