import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X, ImagePlus } from 'lucide-react';
import { photosApi } from '../services/api';
import { cn } from '../lib/utils';
import { getApiErrorMessage } from '../lib/apiErrorMessage';

const MAX_FILES = 5;
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_SIZE_LABEL = '5 MB';
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

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
  const fileInputRef = useRef(null);

  const addFiles = useCallback((incoming) => {
    const arr = Array.from(incoming);
    const invalidType = arr.filter((f) => !ACCEPTED_TYPES.includes(f.type));
    if (invalidType.length > 0) {
      setError(`Invalid format: ${invalidType.map((f) => f.name).join(', ')}. Only JPEG, PNG, GIF, and WebP are allowed.`);
      return;
    }
    const oversized = arr.filter((f) => f.size > MAX_SIZE_BYTES);
    if (oversized.length > 0) {
      setError(`Too large: ${oversized.map((f) => f.name).join(', ')}. Each image must be under ${MAX_SIZE_LABEL}.`);
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

  const removeFile = (index) => {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      const urls = next.map((f) => URL.createObjectURL(f));
      setPreviews((old) => {
        old.forEach((u) => URL.revokeObjectURL(u));
        return urls;
      });
      return next;
    });
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
          </div>

          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {previews.map((url, i) => (
                <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <div className="absolute inset-x-0 bottom-0 bg-black/50 px-1.5 py-0.5 text-center text-[10px] text-white">
                    {i + 1} / {files.length}
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/30">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || files.length === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 py-2.5 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {loading
              ? 'Uploading...'
              : `Upload ${files.length} photo${files.length !== 1 ? 's' : ''}`}
          </button>
        </form>
      </div>
    </div>
  );
}
