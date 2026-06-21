import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X, ImagePlus } from 'lucide-react';
import { photosApi } from '../services/api';
import { cn } from '../lib/utils';
import { getApiErrorMessage } from '../lib/apiErrorMessage';
import {
  compressImageFile,
  formatFileSize,
  IMAGE_ACCEPTED_TYPES,
  ONE_MB,
} from '../lib/imageProcessing';
import ImageCropModal from '../components/ImageCropModal';

const MAX_FILES = 5;
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_SIZE_LABEL = '5 MB';
const TARGET_SIZE_BYTES = 2 * ONE_MB;
const TARGET_SIZE_LABEL = '2 MB';

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white';

export default function UploadPhotoForm() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [processingIndex, setProcessingIndex] = useState(null);
  const [cropIndex, setCropIndex] = useState(null);
  const fileInputRef = useRef(null);

  const addFiles = useCallback((incoming) => {
    const arr = Array.from(incoming);
    const invalidType = arr.filter((f) => !IMAGE_ACCEPTED_TYPES.includes(f.type));
    if (invalidType.length > 0) {
      setError(`Invalid format: ${invalidType.map((f) => f.name).join(', ')}. Only JPEG, PNG, GIF, and WebP are allowed.`);
      return;
    }

    setFiles((prev) => {
      const remaining = MAX_FILES - prev.length;
      if (remaining <= 0) {
        setError(`Maximum ${MAX_FILES} images allowed. Remove some to add more.`);
        return prev;
      }
      const toAdd = arr.slice(0, remaining);
      if (arr.length > remaining) {
        setError(`Only ${remaining} more image${remaining > 1 ? 's' : ''} can be added (limit: ${MAX_FILES}).`);
      } else {
        setError('');
      }
      const combined = [...prev, ...toAdd];
      const urls = combined.map((f) => URL.createObjectURL(f));
      setPreviews((old) => {
        old.forEach((u) => URL.revokeObjectURL(u));
        return urls;
      });
      return combined;
    });
  }, []);

  const updateFiles = useCallback((nextFiles) => {
    setFiles(nextFiles);
    setPreviews((old) => {
      old.forEach((u) => URL.revokeObjectURL(u));
      return nextFiles.map((f) => URL.createObjectURL(f));
    });
  }, []);

  const removeFile = (index) => {
    updateFiles(files.filter((_, i) => i !== index));
  };

  const processFile = async (index, cropSquare = false) => {
    const file = files[index];
    if (!file) return;
    setError('');
    setProcessingIndex(index);
    try {
      const processed = await compressImageFile(file, {
        targetBytes: TARGET_SIZE_BYTES,
        cropSquare,
        maxWidth: cropSquare ? 1400 : 1800,
        maxHeight: cropSquare ? 1400 : 1800,
      });
      const next = files.map((f, i) => (i === index ? processed : f));
      updateFiles(next);
      if (processed.size > MAX_SIZE_BYTES) {
        setError(`${processed.name} is still larger than ${MAX_SIZE_LABEL}. Try crop + compress.`);
      }
    } catch (err) {
      setError(err.message || 'Could not process image.');
    } finally {
      setProcessingIndex(null);
    }
  };

  const applyCroppedFile = (cropped) => {
    if (cropIndex == null) return;
    updateFiles(files.map((f, i) => (i === cropIndex ? cropped : f)));
    setCropIndex(null);
  };

  const processAllLarge = async () => {
    let working = [...files];
    setError('');
    try {
      for (let i = 0; i < working.length; i += 1) {
        if (working[i].size > MAX_SIZE_BYTES) {
          setProcessingIndex(i);
          // Process sequentially to avoid high memory pressure on mobile browsers.
          // eslint-disable-next-line no-await-in-loop
          const processed = await compressImageFile(working[i], {
            targetBytes: TARGET_SIZE_BYTES,
            cropSquare: false,
            maxWidth: 1800,
            maxHeight: 1800,
          });
          working = working.map((f, idx) => (idx === i ? processed : f));
          updateFiles(working);
        }
      }
    } catch (err) {
      setError(err.message || 'Could not process image.');
    } finally {
      setProcessingIndex(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setError('Please select at least one image');
      return;
    }
    const oversized = files.filter((f) => f.size > MAX_SIZE_BYTES);
    if (oversized.length > 0) {
      setError(`Please compress or remove oversized images first: ${oversized.map((f) => f.name).join(', ')}`);
      return;
    }
    setError('');
    setLoading(true);
    try {
      await photosApi.upload(files, title || files[0].name);
      navigate('/gallery');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Upload failed'));
    } finally {
      setLoading(false);
    }
  };

  const oversizedCount = files.filter((f) => f.size > MAX_SIZE_BYTES).length;
  const canSubmit = files.length > 0 && oversizedCount === 0 && processingIndex === null && !loading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Upload Photos</h1>
        <button
          type="button"
          onClick={() => navigate('/gallery')}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Cancel
        </button>
      </div>

      <div className="max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Family Trip"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              All photos in this upload will share this title
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Images * <span className="font-normal text-gray-400">({files.length}/{MAX_FILES})</span>
            </label>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => files.length < MAX_FILES && fileInputRef.current?.click()}
              className={cn(
                'relative cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors',
                dragActive
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20'
                  : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50 dark:border-gray-600 dark:hover:border-primary-500 dark:hover:bg-gray-800/50',
                files.length >= MAX_FILES && 'pointer-events-none opacity-60'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              <ImagePlus className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500" />
              <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {files.length >= MAX_FILES
                  ? 'Maximum files reached'
                  : 'Click or drag & drop images here'}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                JPEG, PNG, GIF, WebP — up to {MAX_FILES} images, {MAX_SIZE_LABEL} each
              </p>
            </div>
            {oversizedCount > 0 && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100">
                <p className="font-medium">
                  {oversizedCount} image{oversizedCount > 1 ? 's are' : ' is'} over {MAX_SIZE_LABEL}.
                </p>
                <p className="mt-1 text-xs">
                  Use Compress to {TARGET_SIZE_LABEL} or Crop square + compress before uploading.
                </p>
                <button
                  type="button"
                  onClick={processAllLarge}
                  disabled={processingIndex !== null}
                  className="mt-2 rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-50"
                >
                  {processingIndex !== null ? 'Processing...' : `Compress all large images to ${TARGET_SIZE_LABEL}`}
                </button>
              </div>
            )}
          </div>

          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {previews.map((url, i) => {
                const file = files[i];
                const tooLarge = file?.size > MAX_SIZE_BYTES;
                return (
                <div
                  key={i}
                  className={cn(
                    'group relative aspect-square overflow-hidden rounded-lg border dark:border-gray-700',
                    tooLarge ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-gray-200'
                  )}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <div className="absolute inset-x-0 bottom-0 bg-black/50 px-1.5 py-0.5 text-center text-[10px] text-white">
                    {formatFileSize(file?.size || 0)}
                  </div>
                  {tooLarge && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/70 p-2 text-center">
                      <p className="text-[10px] font-semibold text-amber-100">Over {MAX_SIZE_LABEL}</p>
                      <button
                        type="button"
                        onClick={() => processFile(i, false)}
                        disabled={processingIndex !== null}
                        className="rounded bg-primary-600 px-2 py-1 text-[10px] font-medium text-white disabled:opacity-50"
                      >
                        {processingIndex === i ? 'Working...' : `Compress to ${TARGET_SIZE_LABEL}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCropIndex(i)}
                        disabled={processingIndex !== null}
                        className="rounded bg-white/15 px-2 py-1 text-[10px] font-medium text-white disabled:opacity-50"
                      >
                        Crop image
                      </button>
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/30">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 py-2.5 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {processingIndex !== null
              ? 'Processing image...'
              : loading
              ? 'Uploading...'
              : `Upload ${files.length} photo${files.length !== 1 ? 's' : ''}`}
          </button>
        </form>
      </div>
      <ImageCropModal
        open={cropIndex != null}
        file={cropIndex == null ? null : files[cropIndex]}
        title="Crop gallery image"
        targetBytes={TARGET_SIZE_BYTES}
        onClose={() => setCropIndex(null)}
        onApply={applyCroppedFile}
      />
    </div>
  );
}
