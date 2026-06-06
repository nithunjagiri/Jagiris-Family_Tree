import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Upload, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { photosApi } from '../services/api';
import { cn } from '../lib/utils';
import { resolveBackendPublicUrl } from '../lib/backendOrigin';
import { getApiErrorMessage } from '../lib/apiErrorMessage';

export default function PhotoGallery() {
  const { isAdmin } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [viewerIndex, setViewerIndex] = useState(null);

  const load = () =>
    photosApi
      .list()
      .then((r) => setPhotos(r.data || []))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const closeViewer = useCallback(() => setViewerIndex(null), []);
  const showPrevious = useCallback(() => {
    setViewerIndex((current) => {
      if (current == null || photos.length === 0) return current;
      return (current - 1 + photos.length) % photos.length;
    });
  }, [photos.length]);
  const showNext = useCallback(() => {
    setViewerIndex((current) => {
      if (current == null || photos.length === 0) return current;
      return (current + 1) % photos.length;
    });
  }, [photos.length]);

  useEffect(() => {
    if (viewerIndex == null) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeViewer();
      if (event.key === 'ArrowLeft') showPrevious();
      if (event.key === 'ArrowRight') showNext();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeViewer, showNext, showPrevious, viewerIndex]);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    setDeletingId(id);
    try {
      await photosApi.delete(id);
      setPhotos((p) => p.filter((x) => x.id !== id));
    } catch (err) {
      alert(getApiErrorMessage(err, 'Failed to delete'));
    } finally {
      setDeletingId(null);
    }
  };

  const viewerPhoto = viewerIndex == null ? null : photos[viewerIndex];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Photo Gallery</h1>
        <Link
          to="/gallery/upload"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-primary-700"
        >
          <Upload className="h-5 w-5" />
          Upload Photos
        </Link>
      </div>

      {/* Pinterest-style masonry-like grid with hover zoom */}
      <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
        {photos.map((p, index) => (
          <button
            type="button"
            key={p.id}
            onClick={() => setViewerIndex(index)}
            className="group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-soft transition-shadow hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-800 dark:bg-gray-900"
            aria-label={`Open ${p.title || 'photo'} full screen`}
          >
            <div className="overflow-hidden rounded-2xl">
              <img
                src={resolveBackendPublicUrl(p.image_path)}
                alt={p.title}
                className="h-auto w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12">
              <p className="font-medium text-white">{p.title}</p>
              <p className="text-xs text-white/80">
                {p.uploaded_at && new Date(p.uploaded_at).toLocaleDateString()}
              </p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete(p.id, p.title);
                  }}
                  disabled={deletingId === p.id}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-600/90 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deletingId === p.id ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </div>
          </button>
        ))}
      </div>

      {photos.length === 0 && (
        <p className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
          No photos yet. Upload one to get started.
        </p>
      )}

      {viewerPhoto && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white"
          role="dialog"
          aria-modal="true"
          aria-label="Full screen photo viewer"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold sm:text-base">{viewerPhoto.title || 'Photo'}</p>
              <p className="text-xs text-white/60">
                {viewerIndex + 1} of {photos.length}
                {viewerPhoto.uploaded_at ? ` · ${new Date(viewerPhoto.uploaded_at).toLocaleDateString()}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={closeViewer}
              className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Close full screen viewer"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="relative min-h-0 flex-1">
            <button
              type="button"
              onClick={showPrevious}
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white transition hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:hidden sm:left-5 sm:p-3"
              aria-label="Previous photo"
              disabled={photos.length <= 1}
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
            <img
              src={resolveBackendPublicUrl(viewerPhoto.image_path)}
              alt={viewerPhoto.title || ''}
              className="h-full w-full object-contain"
            />
            <button
              type="button"
              onClick={showNext}
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white transition hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:hidden sm:right-5 sm:p-3"
              aria-label="Next photo"
              disabled={photos.length <= 1}
            >
              <ChevronRight className="h-7 w-7" />
            </button>
          </div>

          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto border-t border-white/10 px-4 py-3">
              {photos.map((photo, index) => (
                <button
                  type="button"
                  key={photo.id}
                  onClick={() => setViewerIndex(index)}
                  className={cn(
                    'h-14 w-14 shrink-0 overflow-hidden rounded-lg border transition sm:h-16 sm:w-16',
                    index === viewerIndex
                      ? 'border-primary-400 ring-2 ring-primary-400/60'
                      : 'border-white/20 opacity-70 hover:opacity-100'
                  )}
                  aria-label={`View photo ${index + 1}`}
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
      )}
    </div>
  );
}
