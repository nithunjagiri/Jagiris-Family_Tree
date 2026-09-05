import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackNavigationOrigin } from '../lib/navigationOrigin';

/** Tracks cross-module entry points for view/edit workflows (mounted once in Layout). */
export default function NavigationOriginTracker() {
  const location = useLocation();
  const prevLocationRef = useRef(location);

  useEffect(() => {
    trackNavigationOrigin(prevLocationRef.current, location);
    prevLocationRef.current = location;
  }, [location]);

  return null;
}
