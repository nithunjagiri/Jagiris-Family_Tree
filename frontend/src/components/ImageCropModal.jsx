import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cropImageFile, cropPreviewImageStyle, formatFileSize } from '../lib/imageProcessing';

const ASPECT_OPTIONS = [
  { label: 'Square', value: '1', ratio: 1 },
  { label: 'Portrait', value: '4/5', ratio: 4 / 5 },
  { label: 'Vertical', value: '9/16', ratio: 9 / 16 },
  { label: 'Landscape', value: '16/9', ratio: 16 / 9 },
  { label: 'Classic', value: '4/3', ratio: 4 / 3 },
];

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function touchDistance(touches) {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

export default function ImageCropModal({
  file,
  open,
  onClose,
  onApply,
  targetBytes = null,
  title = 'Crop image',
}) {
  const [aspectValue, setAspectValue] = useState('1');
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0.5);
  const [offsetY, setOffsetY] = useState(0.5);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [imageSize, setImageSize] = useState({ w: 0, h: 0 });

  const viewportRef = useRef(null);
  const gestureRef = useRef(null);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const selectedAspect = ASPECT_OPTIONS.find((o) => o.value === aspectValue) || ASPECT_OPTIONS[0];

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    if (!open || !previewUrl) return;
    setAspectValue('1');
    setZoom(1);
    setOffsetX(0.5);
    setOffsetY(0.5);
    setError('');
    const img = new Image();
    img.onload = () => setImageSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = previewUrl;
  }, [open, file, previewUrl]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!open || !el) return undefined;

    const onTouchMove = (e) => {
      const g = gestureRef.current;
      if (!g) return;
      e.preventDefault();

      if (g.mode === 'pinch' && e.touches.length >= 2) {
        const dist = touchDistance(e.touches);
        if (g.startDist > 0) {
          const next = g.startZoom * (dist / g.startDist);
          setZoom(Math.min(3, Math.max(1, next)));
        }
      } else if (g.mode === 'pan' && e.touches.length === 1) {
        const dx = e.touches[0].clientX - g.startX;
        const dy = e.touches[0].clientY - g.startY;
        const scale = 1 / Math.max(120, g.viewportSize * 0.35);
        setOffsetX(clamp01(g.startOffsetX - dx * scale));
        setOffsetY(clamp01(g.startOffsetY - dy * scale));
      }
    };

    const endGesture = () => {
      gestureRef.current = null;
    };

    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', endGesture);
    el.addEventListener('touchcancel', endGesture);
    return () => {
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', endGesture);
      el.removeEventListener('touchcancel', endGesture);
    };
  }, [open]);

  if (!open || !file || !previewUrl) return null;

  const previewStyle = cropPreviewImageStyle(
    imageSize.w,
    imageSize.h,
    selectedAspect.ratio,
    zoom,
    offsetX,
    offsetY
  );

  const startPan = (clientX, clientY) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    gestureRef.current = {
      mode: 'pan',
      startX: clientX,
      startY: clientY,
      startOffsetX: offsetX,
      startOffsetY: offsetY,
      viewportSize: Math.min(rect?.width || 280, rect?.height || 280),
    };
  };

  const onTouchStart = (e) => {
    if (e.touches.length >= 2) {
      gestureRef.current = {
        mode: 'pinch',
        startDist: touchDistance(e.touches),
        startZoom: zoom,
      };
    } else if (e.touches.length === 1) {
      startPan(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    startPan(e.clientX, e.clientY);
    const onMove = (ev) => {
      const g = gestureRef.current;
      if (!g || g.mode !== 'pan') return;
      const dx = ev.clientX - g.startX;
      const dy = ev.clientY - g.startY;
      const scale = 1 / Math.max(120, g.viewportSize * 0.35);
      setOffsetX(clamp01(g.startOffsetX - dx * scale));
      setOffsetY(clamp01(g.startOffsetY - dy * scale));
    };
    const onUp = () => {
      gestureRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom((z) => Math.min(3, Math.max(1, z + delta)));
  };

  const handleApply = async () => {
    setProcessing(true);
    setError('');
    try {
      const cropped = await cropImageFile(file, {
        aspectRatio: selectedAspect.ratio,
        offsetX,
        offsetY,
        zoom,
        targetBytes,
        maxWidth: 1800,
        maxHeight: 1800,
      });
      onApply(cropped);
    } catch (err) {
      setError(err.message || 'Could not crop image.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[96vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900 sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Original size: {formatFileSize(file.size)}
              {targetBytes ? ` · output will be compressed near ${formatFileSize(targetBytes)}` : ''}
            </p>
            <p className="mt-0.5 text-xs text-primary-600 dark:text-primary-400 md:hidden">
              Pinch to zoom · drag to move
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label="Close crop dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-auto p-4 md:grid-cols-[minmax(0,1fr)_260px]">
          <div className="flex min-h-[240px] items-center justify-center rounded-xl bg-black/90 p-3 sm:min-h-[280px] sm:p-4">
            <div
              ref={viewportRef}
              className="relative w-full max-w-lg overflow-hidden border-2 border-white/80 bg-black touch-none"
              style={{ aspectRatio: selectedAspect.ratio, maxHeight: '58vh' }}
              onTouchStart={onTouchStart}
              onMouseDown={onMouseDown}
              onWheel={onWheel}
              role="presentation"
            >
              <img src={previewUrl} alt="" draggable={false} style={previewStyle} />
              <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/20" />
            </div>
          </div>

          <div className="hidden space-y-4 md:block">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Crop shape</label>
              <select
                value={aspectValue}
                onChange={(e) => setAspectValue(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                {ASPECT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Zoom</label>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Horizontal position</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={offsetX}
                onChange={(e) => setOffsetX(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Vertical position</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={offsetY}
                onChange={(e) => setOffsetY(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Crop shape</label>
              <select
                value={aspectValue}
                onChange={(e) => setAspectValue(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                {ASPECT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && <p className="px-4 pb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium dark:border-gray-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={processing}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {processing ? 'Applying...' : 'Apply crop'}
          </button>
        </div>
      </div>
    </div>
  );
}
