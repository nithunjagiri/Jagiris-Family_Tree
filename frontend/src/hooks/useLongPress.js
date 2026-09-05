import { useCallback, useRef } from 'react';

/**
 * Long-press (mobile) and right-click (desktop) handler for inbox thread actions.
 */
export function useLongPress(onLongPress, { delay = 500, onClick } = {}) {
  const timerRef = useRef(null);
  const longPressedRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(
    (e) => {
      if (e.type === 'mousedown' && e.button !== 0) return;
      longPressedRef.current = false;
      clear();
      timerRef.current = setTimeout(() => {
        longPressedRef.current = true;
        onLongPress?.(e);
      }, delay);
    },
    [clear, delay, onLongPress]
  );

  const click = useCallback(
    (e) => {
      clear();
      if (!longPressedRef.current) onClick?.(e);
    },
    [clear, onClick]
  );

  const contextMenu = useCallback(
    (e) => {
      e.preventDefault();
      longPressedRef.current = true;
      onLongPress?.(e);
    },
    [onLongPress]
  );

  return {
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: clear,
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onClick: click,
    onContextMenu: contextMenu,
  };
}
