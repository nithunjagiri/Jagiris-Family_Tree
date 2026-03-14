import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { photosApi } from '../services/api';
import { cn } from '../lib/utils';

export default function PhotoGallery() {
  const { isAdmin } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const load = () =>
    photosApi
      .list()
      .then((r) => setPhotos(r.data || []))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    setDeletingId(id);
    try {
      await photosApi.delete(id);
      setPhotos((p) => p.filter((x) => x.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Photo Gallery</h1>
        <Link
          to="/gallery/upload"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-primary-700"
        >
          <Upload className="h-5 w-5" />
          Upload Photo
        </Link>
      </div>

      {/* Pinterest-style masonry-like grid with hover zoom */}
      <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
        {photos.map((p) => (
          <div
            key={p.id}
            className="group relative mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-soft transition-shadow hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="overflow-hidden rounded-2xl">
              <img
                src={p.image_path}
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
                  onClick={() => handleDelete(p.id, p.title)}
                  disabled={deletingId === p.id}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-600/90 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deletingId === p.id ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {photos.length === 0 && (
        <p className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
          No photos yet. Upload one to get started.
        </p>
      )}
    </div>
  );
}
