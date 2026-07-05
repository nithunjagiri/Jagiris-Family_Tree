import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { locationPath, saveNavigationOriginState } from '../lib/navigationOrigin';

/**
 * Persist in-memory UI state for a route so Back navigation can restore filters, tabs, etc.
 * @param {string} storagePath - Stable path key (e.g. `/reports/living-members`)
 * @param {Record<string, unknown>} stateValues
 */
export function useSavePageStateOnUnmount(storagePath, stateValues) {
  const valuesRef = useRef(stateValues);
  valuesRef.current = stateValues;

  useEffect(() => {
    if (!storagePath) return undefined;
    return () => saveNavigationOriginState(storagePath, valuesRef.current);
  }, [storagePath]);
}

/**
 * Apply page state returned via Back navigation, then strip it from history.
 * @param {(restored: Record<string, unknown>) => void} applyState
 */
export function useRestorePageState(applyState) {
  const location = useLocation();
  const navigate = useNavigate();
  const appliedRef = useRef(false);
  const applyRef = useRef(applyState);
  applyRef.current = applyState;

  useEffect(() => {
    if (appliedRef.current) return;
    const restored = location.state?.restoredPageState;
    if (!restored || typeof restored !== 'object') return;
    appliedRef.current = true;
    applyRef.current(restored);
    navigate(locationPath(location), { replace: true, state: {} });
  }, [location, navigate]);
}
