import { useEffect, useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  compressImageFile,
  formatFileSize,
  IMAGE_ACCEPTED_TYPES,
  ONE_MB,
} from '../lib/imageProcessing';
import ImageCropModal from './ImageCropModal';

export const EVENT_MAX_SIZE_BYTES = 2 * 1024 * 1024;
export const EVENT_MAX_SIZE_LABEL = '2 MB';
export const EVENT_TARGET_SIZE_BYTES = ONE_MB;
export const EVENT_TARGET_SIZE_LABEL = '1 MB';

export default function EventForm({
  mode = 'add',
  initialValues = {},
  existingImageUrl = null,
  onSubmit,
  onCancel,
  submitLabel,
  heading,
  submitting = false,
  error = '',
}) {
  const [title, setTitle] = useState(initialValues.title || '');
  const [eventDate, setEventDate] = useState(initialValues.event_date?.slice?.(0, 10) || initialValues.event_date || '');
  const [description, setDescription] = useState(initialValues.description || '');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [localError, setLocalError] = useState('');
  const imageInputRef = useRef(null);

  useEffect(() => {
    setTitle(initialValues.title || '');
    setEventDate(initialValues.event_date?.slice?.(0, 10) || initialValues.event_date || '');
    setDescription(initialValues.description || '');
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues.title, initialValues.event_date, initialValues.description, mode]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const setPreparedImage = (file) => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!IMAGE_ACCEPTED_TYPES.includes(file.type)) {
      setLocalError('Only JPEG, PNG, GIF, or WebP images are allowed.');
      return;
    }
    setLocalError('');
    if (file.size > EVENT_MAX_SIZE_BYTES) {
      setImageProcessing(true);
      try {
        const compressed = await compressImageFile(file, {
          targetBytes: EVENT_TARGET_SIZE_BYTES,
          maxWidth: 1600,
          maxHeight: 1600,
        });
        setPreparedImage(compressed);
      } catch (err) {
        setLocalError(err.message || 'Could not compress event image.');
      } finally {
        setImageProcessing(false);
      }
      return;
    }
    setPreparedImage(file);
  };

  const compressEventImage = async () => {
    if (!imageFile) return;
    setImageProcessing(true);
    setLocalError('');
    try {
      const compressed = await compressImageFile(imageFile, {
        targetBytes: EVENT_TARGET_SIZE_BYTES,
        maxWidth: 1600,
        maxHeight: 1600,
      });
      setPreparedImage(compressed);
    } catch (err) {
      setLocalError(err.message || 'Could not compress event image.');
    } finally {
      setImageProcessing(false);
    }
  };

  const clearEventImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (imageFile?.size > EVENT_MAX_SIZE_BYTES) {
      setLocalError('Please compress or crop the event image before saving.');
      return;
    }
    await onSubmit(
      { title, event_date: eventDate, description: description || null },
      imageFile || undefined
    );
  };

  const displayError = error || localError;
  const previewSrc = imagePreview || existingImageUrl;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900">
      {heading && <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{heading}</h3>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Wedding Anniversary"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Date *</label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Event photo</label>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={handleImageSelect}
          />
          {!previewSrc ? (
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-5 text-center hover:border-primary-400 hover:bg-gray-50 dark:border-gray-600 dark:hover:border-primary-500 dark:hover:bg-gray-800/50"
            >
              <ImagePlus className="h-8 w-8 text-gray-400" />
              <span className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">Choose one photo</span>
              <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                JPEG, PNG, GIF, WebP. Max {EVENT_MAX_SIZE_LABEL}; larger images auto-compress to {EVENT_TARGET_SIZE_LABEL}.
              </span>
            </button>
          ) : (
            <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
              <div className="flex gap-3">
                <img src={previewSrc} alt="" className="h-24 w-24 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {imageFile ? 'Selected photo' : 'Current photo'}
                  </p>
                  {imageFile && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(imageFile.size)}
                      {imageFile.size > EVENT_MAX_SIZE_BYTES ? (
                        <span className="ml-1 text-amber-700 dark:text-amber-300">(over {EVENT_MAX_SIZE_LABEL})</span>
                      ) : null}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium dark:border-gray-600"
                    >
                      Change
                    </button>
                    {imageFile && (
                      <>
                        <button
                          type="button"
                          onClick={compressEventImage}
                          disabled={imageProcessing}
                          className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                        >
                          {imageProcessing ? 'Processing...' : `Compress to ${EVENT_TARGET_SIZE_LABEL}`}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCropOpen(true)}
                          disabled={imageProcessing}
                          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium dark:border-gray-600"
                        >
                          Crop image
                        </button>
                      </>
                    )}
                    {(imageFile || mode === 'edit') && (
                      <button
                        type="button"
                        onClick={clearEventImage}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        {displayError && <p className="text-sm text-red-600 dark:text-red-400">{displayError}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={submitting || imageProcessing}
            className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {imageProcessing ? 'Processing image...' : submitting ? 'Saving...' : submitLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
      <ImageCropModal
        open={cropOpen}
        file={imageFile}
        title="Crop event photo"
        targetBytes={EVENT_TARGET_SIZE_BYTES}
        onClose={() => setCropOpen(false)}
        onApply={(cropped) => {
          setPreparedImage(cropped);
          setCropOpen(false);
        }}
      />
    </div>
  );
}
