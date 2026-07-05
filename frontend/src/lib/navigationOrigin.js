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
function isFamilyMemberProfile(pathname) {
  return /^\/family-members\/[^/]+$/.test(pathname) && !isFamilyMemberEditOrAdd(pathname);
}

/** @param {string} pathname */
function isFamilyMemberWorkflow(pathname) {
  if (pathname === '/family-members') return true;
  if (isFamilyMemberEditOrAdd(pathname)) return true;
  if (isFamilyMemberProfile(pathname)) return true;
  return false;
}

/** Pages where user enters view/edit/add from another module. */
function isWorkflowEntry(pathname) {
  return isFamilyMemberEditOrAdd(pathname) || isFamilyMemberProfile(pathname);
}

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
 * React Router link state carrying the page to return to after a view/edit workflow.
 * @param {import('react-router-dom').Location} location
 */
export function returnToLinkState(location) {
  const returnTo = locationPath(location);
  return { returnTo };
}

/**
 * Record where the user came from before entering a view/edit workflow.
 * Origin is captured once and kept until the user leaves the workflow or returns.
 * @param {import('react-router-dom').Location | null} prevLoc
 * @param {import('react-router-dom').Location} nextLoc
 */
export function trackNavigationOrigin(prevLoc, nextLoc) {
  const nextPathname = nextLoc.pathname;
  const prevPathname = prevLoc?.pathname ?? '';
  const nextInWorkflow = isFamilyMemberWorkflow(nextPathname);
  const prevInWorkflow = isFamilyMemberWorkflow(prevPathname);

  if (nextLoc.state?.returnTo) {
    setNavigationOriginPath(String(nextLoc.state.returnTo));
  }

  if (!nextInWorkflow) {
    if (prevInWorkflow) clearNavigationOrigin();
    return;
  }

  if (nextPathname === '/family-members') {
    if (nextLoc.state?.memberSavedMessage || nextLoc.state?.returnTo) return;
    if (!prevInWorkflow) clearNavigationOrigin();
    return;
  }

  if (isWorkflowEntry(nextPathname) && !prevInWorkflow && prevLoc && prevPathname) {
    if (!nextLoc.state?.returnTo) {
      setNavigationOriginPath(locationPath(prevLoc));
    }
  }
}

/**
 * Resolve a direct jump back to the originating module page (Tika returnTo pattern).
 * @param {string} currentPathname
 * @param {string | undefined} explicitBackTo
 * @returns {{ to: string; state?: { restoredPageState: Record<string, unknown> }; clearOrigin: boolean } | null}
 */
export function resolveBackNavigation(currentPathname, explicitBackTo) {
  if (explicitBackTo) {
    return { to: explicitBackTo, clearOrigin: false };
  }

  if (!isFamilyMemberWorkflow(currentPathname)) return null;

  const origin = getNavigationOriginPath();
  if (!origin) return null;

  const originPathname = origin.split(/[?#]/)[0];
  if (originPathname === currentPathname && currentPathname !== '/family-members') {
    return null;
  }

  const restoredState = loadNavigationOriginState(origin);
  return {
    to: origin,
    state: restoredState != null ? { restoredPageState: restoredState } : undefined,
    clearOrigin: true,
  };
}
