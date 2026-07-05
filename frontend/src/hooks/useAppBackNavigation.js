import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { performAppBack } from '../lib/appBackNavigation';

/**
 * @param {string | undefined} [explicitBackTo]
 */
export function useAppBackNavigation(explicitBackTo) {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    performAppBack(navigate, location.pathname, explicitBackTo);
  }, [navigate, location.pathname, explicitBackTo]);
}
