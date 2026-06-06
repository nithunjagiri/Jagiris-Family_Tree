import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { cropImageFile, formatFileSize } from '../lib/imageProcessing';

const ASPECT_OPTIONS = [
  { label: 'Square', value: '1', ratio: 1 },
  { label: 'Portrait', value: '4/5', ratio: 4 / 5 },
  { label: 'Vertical', value: '9/16', ratio: 9 / 16 },
  { label: 'Landscape', value: '16/9', ratio: 16 / 9 },
  { label: 'Classic', value: '4/3', ratio: 4 / 3 },
];

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

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const selectedAspect = ASPECT_OPTIONS.find((o) => o.value === aspectValue) || ASPECT_OPTIONS[0];

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    if (!open) return;
    setAspectValue('1');
    setZoom(1);
    setOffsetX(0.5);
    setOffsetY(0.5);
    setError('');
  }, [open, file]);

  if (!open || !file || !previewUrl) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Original size: {formatFileSize(file.size)}
              {targetBytes ? ` · output will be compressed near ${formatFileSize(targetBytes)}` : ''}
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
          <div className="flex min-h-[280px] items-center justify-center rounded-xl bg-black/90 p-4">
            <div
              className="relative max-h-[58vh] w-full max-w-lg overflow-hidden border-2 border-white/80 bg-black"
              style={{ aspectRatio: selectedAspect.ratio }}
            >
              <img
                src={previewUrl}
                alt=""
                className="h-full w-full object-cover"
                style={{
                  transform: `scale(${zoom}) translate(${(0.5 - offsetX) * 42}%, ${(0.5 - offsetY) * 42}%)`,
                  transformOrigin: 'center',
                }}
              />
              <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/30" />
            </div>
          </div>

          <div className="space-y-4">
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
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
        </div>

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
