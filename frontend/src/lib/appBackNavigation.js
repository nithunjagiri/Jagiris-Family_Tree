import { clearNavigationOrigin, resolveBackNavigation } from './navigationOrigin';

/**
 * Shared in-app Back behavior for UI buttons and the Android hardware back key.
 * Jumps directly to the preserved originating module when inside a workflow.
 * @param {import('react-router-dom').NavigateFunction} navigate
 * @param {string} pathname
 * @param {string | undefined} [explicitBackTo]
 */
export function performAppBack(navigate, pathname, explicitBackTo) {
  if (explicitBackTo) {
    navigate(explicitBackTo);
    return;
  }

  const resolved = resolveBackNavigation(pathname);
  if (resolved) {
    navigate(resolved.to, { replace: true, state: resolved.state });
    if (resolved.clearOrigin) clearNavigationOrigin();
    return;
  }

  const idx = typeof window !== 'undefined' ? window.history.state?.idx : undefined;
  if (typeof idx === 'number' ? idx > 0 : window.history.length > 1) {
    navigate(-1);
    return;
  }

  navigate('/');
}
