import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { photosApi } from '../services/api';
import { resolveBackendPublicUrl } from '../lib/backendOrigin';
import ModulePageHeader from '../components/ModulePageHeader';
import { getApiErrorMessage } from '../lib/apiErrorMessage';
import { groupPhotosByAlbum } from '../lib/groupPhotosByAlbum';
import PhotoLightbox from '../components/PhotoLightbox';

export default function PhotoGallery() {
  const { isAdmin } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [viewerPhotos, setViewerPhotos] = useState(null);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerTitle, setViewerTitle] = useState('');

  const albums = useMemo(() => groupPhotosByAlbum(photos), [photos]);

  const load = () =>
    photosApi
      .list()
      .then((r) => setPhotos(r.data || []))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const openAlbum = (album) => {
    setViewerPhotos(album.photos);
    setViewerIndex(0);
    setViewerTitle(album.title);
  };

  const closeViewer = () => {
    setViewerPhotos(null);
    setViewerIndex(0);
    setViewerTitle('');
  };

  const handleDelete = async (photo) => {
    if (!window.confirm(`Delete "${photo.title}"?`)) return;
    setDeletingId(photo.id);
    try {
      await photosApi.delete(photo.id);
      setPhotos((p) => p.filter((x) => x.id !== photo.id));
      setViewerPhotos((prev) => {
        if (!prev) return null;
        const next = prev.filter((x) => x.id !== photo.id);
        if (next.length === 0) {
          closeViewer();
          return null;
        }
        setViewerIndex((i) => Math.min(i, next.length - 1));
        return next;
      });
    } catch (err) {
      alert(getApiErrorMessage(err, 'Failed to delete'));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModulePageHeader
        label="Photo Gallery"
        actions={
          <Link
            to="/gallery/upload"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-primary-700"
          >
            <Upload className="h-5 w-5" />
            Upload Photos
          </Link>
        }
      />

      <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
        {albums.map((album) => (
          <button
            type="button"
            key={album.key}
            onClick={() => openAlbum(album)}
            className="group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-soft transition-shadow hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-800 dark:bg-gray-900"
            aria-label={`Open album ${album.title}, ${album.count} photo${album.count !== 1 ? 's' : ''}`}
          >
            <div className="overflow-hidden rounded-2xl">
              <img
                src={resolveBackendPublicUrl(album.coverPhoto.image_path)}
                alt={album.title}
                className="h-auto w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            {album.count > 1 && (
              <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                <Layers className="h-3.5 w-3.5" />
                {album.count} photos
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12">
              <p className="font-medium text-white">{album.title}</p>
              <p className="text-xs text-white/80">
                {album.uploaded_at && new Date(album.uploaded_at).toLocaleDateString()}
              </p>
            </div>
          </button>
        ))}
      </div>

      {albums.length === 0 && (
        <p className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
          No photos yet. Upload one to get started.
        </p>
      )}

      {viewerPhotos && viewerPhotos.length > 0 && (
        <PhotoLightbox
          photos={viewerPhotos}
          index={viewerIndex}
          onClose={closeViewer}
          onIndexChange={setViewerIndex}
          titleOverride={viewerTitle}
          onDelete={isAdmin ? handleDelete : undefined}
          deletingId={deletingId}
        />
      )}
    </div>
  );
}
