/**
 * Scroll the app main pane to an element — avoids scrollIntoView shifting
 * the document/visual viewport on Capacitor Android WebView.
 */

/** @param {string} elementId */
export function scrollMainToElement(elementId, { behavior = 'smooth', offset = 12 } = {}) {
  const main = document.querySelector('main');
  const el = document.getElementById(elementId);
  if (!main || !el) return;

  const top =
    el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - offset;
  main.scrollTo({ top: Math.max(0, top), behavior });

  if (document.documentElement.classList.contains('native-app')) {
    window.scrollTo(0, 0);
  }
}
