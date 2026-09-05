import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { resolveBackendPublicUrl } from '../lib/backendOrigin';

/**
 * Full-screen photo viewer with optional prev/next, thumbnails, and tap-to-hide controls.
 */
export default function PhotoLightbox({
  photos,
  index,
  onClose,
  onIndexChange,
  titleOverride,
  showThumbnails = true,
  onDelete,
  deletingId,
}) {
  const [controlsVisible, setControlsVisible] = useState(true);
  const touchStartX = useRef(null);

  const current = photos[index];
  const hasMultiple = photos.length > 1;

  const showPrevious = useCallback(() => {
    if (!hasMultiple) return;
    onIndexChange((index - 1 + photos.length) % photos.length);
  }, [hasMultiple, index, onIndexChange, photos.length]);

  const showNext = useCallback(() => {
    if (!hasMultiple) return;
    onIndexChange((index + 1) % photos.length);
  }, [hasMultiple, index, onIndexChange, photos.length]);

  useEffect(() => {
    setControlsVisible(true);
  }, [index]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') showPrevious();
      if (event.key === 'ArrowRight') showNext();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, showNext, showPrevious]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e) => {
    const start = touchStartX.current;
    const end = e.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (start == null || end == null) return;
    const delta = end - start;
    if (Math.abs(delta) < 50) return;
    if (delta > 0) showPrevious();
    else showNext();
  };

  if (!current) return null;

  const displayTitle = titleOverride || current.title || 'Photo';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Full screen photo viewer"
    >
      <div
        className={cn(
          'flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 transition-opacity',
          controlsVisible ? 'opacity-100' : 'opacity-70'
        )}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold sm:text-base">{displayTitle}</p>
          <p className="text-xs text-white/60">
            {hasMultiple ? `${index + 1} of ${photos.length}` : '1 photo'}
            {current.uploaded_at ? ` · ${new Date(current.uploaded_at).toLocaleDateString()}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label="Close full screen viewer"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        {hasMultiple && (
          <button
            type="button"
            onClick={showPrevious}
            className={cn(
              'absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white transition hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/50 sm:left-5 sm:p-3',
              !controlsVisible && 'pointer-events-none opacity-0'
            )}
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
        )}

        <button
          type="button"
          className="flex h-full w-full items-center justify-center focus:outline-none"
          aria-label="Toggle navigation controls"
          onClick={() => setControlsVisible((v) => !v)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={resolveBackendPublicUrl(current.image_path)}
            alt={current.title || ''}
            className="max-h-full max-w-full object-contain"
            draggable={false}
          />
        </button>

        {hasMultiple && (
          <button
            type="button"
            onClick={showNext}
            className={cn(
              'absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white transition hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/50 sm:right-5 sm:p-3',
              !controlsVisible && 'pointer-events-none opacity-0'
            )}
            aria-label="Next photo"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        )}
      </div>

      {onDelete && (
        <div
          className={cn(
            'border-t border-white/10 px-4 py-2 text-center transition-opacity',
            controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
        >
          <button
            type="button"
            onClick={() => onDelete(current)}
            disabled={deletingId === current.id}
            className="rounded-lg bg-red-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
          >
            {deletingId === current.id ? 'Deleting...' : 'Delete this photo'}
          </button>
        </div>
      )}

      {showThumbnails && hasMultiple && (
        <div
          className={cn(
            'flex gap-2 overflow-x-auto border-t border-white/10 px-4 py-3 transition-opacity',
            controlsVisible ? 'opacity-100' : 'opacity-60'
          )}
        >
          {photos.map((photo, i) => (
            <button
              type="button"
              key={photo.id}
              onClick={() => onIndexChange(i)}
              className={cn(
                'h-14 w-14 shrink-0 overflow-hidden rounded-lg border transition sm:h-16 sm:w-16',
                i === index
                  ? 'border-primary-400 ring-2 ring-primary-400/60'
                  : 'border-white/20 opacity-70 hover:opacity-100'
              )}
              aria-label={`View photo ${i + 1}`}
            >
              <img
                src={resolveBackendPublicUrl(photo.image_path)}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
