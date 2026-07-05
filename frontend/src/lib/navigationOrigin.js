const ORIGIN_PATH_KEY = 'jagiris:nav-origin-path';
const ORIGIN_STATE_PREFIX = 'jagiris:nav-origin-state:';

/** @param {import('react-router-dom').Location | { pathname: string; search?: string; hash?: string }} loc */
export function locationPath(loc) {
  return `${loc.pathname}${loc.search || ''}${loc.hash || ''}`;
}

function stateStorageKey(path) {
  return `${ORIGIN_STATE_PREFIX}${encodeURIComponent(path)}`;
}

/** @param {string} pathname */
function isFamilyMemberEditOrAdd(pathname) {
  return /^\/family-members\/(edit\/|add)/.test(pathname);
}

/** @param {string} pathname */
function isFamilyMemberWorkflow(pathname) {
  if (pathname === '/family-members') return true;
  if (isFamilyMemberEditOrAdd(pathname)) return true;
  if (/^\/family-members\/[^/]+$/.test(pathname)) return true;
  return false;
}

/** Pages that show a Back button returning to a stored cross-module origin. */
const ORIGIN_BACK_LANDING_PATHS = new Set(['/family-members']);

export function setNavigationOriginPath(path) {
  if (path) sessionStorage.setItem(ORIGIN_PATH_KEY, path);
}

export function getNavigationOriginPath() {
  return sessionStorage.getItem(ORIGIN_PATH_KEY);
}

export function clearNavigationOrigin() {
  const path = getNavigationOriginPath();
  sessionStorage.removeItem(ORIGIN_PATH_KEY);
  if (path) clearNavigationOriginState(path);
}

/** @param {string} path @param {Record<string, unknown>} state */
export function saveNavigationOriginState(path, state) {
  if (!path || state == null) return;
  try {
    sessionStorage.setItem(stateStorageKey(path), JSON.stringify(state));
  } catch {
    /* storage full or unavailable */
  }
}

/** @param {string} path */
export function loadNavigationOriginState(path) {
  if (!path) return null;
  try {
    const raw = sessionStorage.getItem(stateStorageKey(path));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** @param {string} path */
export function clearNavigationOriginState(path) {
  if (!path) return;
  sessionStorage.removeItem(stateStorageKey(path));
}

/**
 * Record where the user came from before entering a view/edit workflow.
 * @param {import('react-router-dom').Location | null} prevLoc
 * @param {import('react-router-dom').Location} nextLoc
 */
export function trackNavigationOrigin(prevLoc, nextLoc) {
  const nextPathname = nextLoc.pathname;

  if (nextPathname === '/family-members') {
    if (nextLoc.state?.memberSavedMessage || nextLoc.state?.returnTo) {
      if (nextLoc.state.returnTo) setNavigationOriginPath(nextLoc.state.returnTo);
      return;
    }
    clearNavigationOrigin();
    return;
  }

  if (!isFamilyMemberWorkflow(nextPathname)) return;

  if (isFamilyMemberEditOrAdd(nextPathname)) return;

  const prevPathname = prevLoc?.pathname ?? '';
  if (isFamilyMemberEditOrAdd(prevPathname)) return;

  if (prevLoc && prevPathname) {
    setNavigationOriginPath(locationPath(prevLoc));
  }
}

/**
 * Resolve destination for the in-app Back button on landing pages after a save workflow.
 * @param {string} currentPathname
 * @param {string | undefined} explicitBackTo
 * @returns {{ to: string; state?: { restoredPageState: Record<string, unknown> }; clearOrigin: boolean } | null}
 */
export function resolveBackNavigation(currentPathname, explicitBackTo) {
  if (explicitBackTo) {
    return { to: explicitBackTo, clearOrigin: false };
  }

  if (!ORIGIN_BACK_LANDING_PATHS.has(currentPathname)) return null;

  const origin = getNavigationOriginPath();
  if (!origin) return null;

  const restoredState = loadNavigationOriginState(origin);
  return {
    to: origin,
    state: restoredState != null ? { restoredPageState: restoredState } : undefined,
    clearOrigin: true,
  };
}
