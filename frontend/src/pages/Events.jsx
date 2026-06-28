import { useState, useEffect, useRef } from 'react';
import { Calendar, ImagePlus, Plus, X } from 'lucide-react';
import { eventsApi } from '../services/api';
import { cn } from '../lib/utils';
import { getApiErrorMessage } from '../lib/apiErrorMessage';
import { eventCalendarParts } from '../lib/calendarDate';
import { resolveBackendPublicUrl } from '../lib/backendOrigin';
import ModulePageHeader from '../components/ModulePageHeader';
import {
  compressImageFile,
  formatFileSize,
  IMAGE_ACCEPTED_TYPES,
  ONE_MB,
} from '../lib/imageProcessing';
import ImageCropModal from '../components/ImageCropModal';
import EventDetailModal from '../components/EventDetailModal';
import PhotoLightbox from '../components/PhotoLightbox';

const EVENT_MAX_SIZE_BYTES = 2 * 1024 * 1024;
const EVENT_MAX_SIZE_LABEL = '2 MB';
const EVENT_TARGET_SIZE_BYTES = ONE_MB;
const EVENT_TARGET_SIZE_LABEL = '1 MB';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [upcoming, setUpcoming] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [event_date, setEventDate] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventImageLightbox, setEventImageLightbox] = useState(null);
  const imageInputRef = useRef(null);

  const load = () => {
    setLoading(true);
    eventsApi
      .list(upcoming)
      .then((r) => setEvents(r.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [upcoming]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (imageFile?.size > EVENT_MAX_SIZE_BYTES) {
      setSubmitError('Please compress or crop the event image before adding the event.');
      return;
    }
    setSubmitting(true);
    try {
      await eventsApi.add({ title, event_date, description: description || null }, imageFile || undefined);
      setTitle('');
      setEventDate('');
      setDescription('');
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImageFile(null);
      setImagePreview(null);
      setShowForm(false);
      load();
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, 'Failed to add event'));
    } finally {
      setSubmitting(false);
    }
  };

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
      setSubmitError('Only JPEG, PNG, GIF, or WebP images are allowed.');
      return;
    }
    setSubmitError('');
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
        setSubmitError(err.message || 'Could not compress event image.');
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
    setSubmitError('');
    try {
      const compressed = await compressImageFile(imageFile, {
        targetBytes: EVENT_TARGET_SIZE_BYTES,
        maxWidth: 1600,
        maxHeight: 1600,
      });
      setPreparedImage(compressed);
    } catch (err) {
      setSubmitError(err.message || 'Could not compress event image.');
    } finally {
      setImageProcessing(false);
    }
  };

  const clearEventImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <div className="space-y-6">
      <ModulePageHeader
        label="Events"
        actions={
          <>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={upcoming}
                onChange={(e) => setUpcoming(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Upcoming only
            </label>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-primary-700"
            >
              <Plus className="h-5 w-5" />
              Add Event
            </button>
          </>
        }
      />

      {showForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Add event</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Wedding Anniversary"
                className={cn(
                  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
                )}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Date *
              </label>
              <input
                type="date"
                value={event_date}
                onChange={(e) => setEventDate(e.target.value)}
                required
                className={cn(
                  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
                )}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className={cn(
                  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
                )}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Event photo
              </label>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleImageSelect}
              />
              {!imagePreview ? (
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
                    <img src={imagePreview} alt="" className="h-24 w-24 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Selected photo</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(imageFile?.size || 0)}
                        {imageFile?.size > EVENT_MAX_SIZE_BYTES ? (
                          <span className="ml-1 text-amber-700 dark:text-amber-300">(over {EVENT_MAX_SIZE_LABEL})</span>
                        ) : null}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium dark:border-gray-600"
                        >
                          Change
                        </button>
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
                        <button
                          type="button"
                          onClick={clearEventImage}
                          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {submitError && <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting || imageProcessing}
                className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {imageProcessing ? 'Processing image...' : submitting ? 'Adding...' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
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
      )}

      {/* Calendar-style event list */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-soft dark:border-gray-800 dark:bg-gray-900 dark:shadow-soft-dark">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {events.length === 0 && (
              <li className="py-12 text-center text-gray-500 dark:text-gray-400">No events found.</li>
            )}
            {events.map((ev) => {
              const parts = eventCalendarParts(ev.event_date);
              return (
              <li
                key={ev.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedEvent(ev)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedEvent(ev);
                  }
                }}
                className="flex cursor-pointer gap-4 p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <div className="flex shrink-0 flex-col items-center justify-center rounded-xl bg-primary-100 px-3 py-2 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  <span className="text-xs font-medium uppercase">
                    {parts?.monthShort ?? '—'}
                  </span>
                  <span className="text-xl font-bold">
                    {parts?.day ?? '—'}
                  </span>
                  <span className="text-xs">
                    {parts?.year ?? '—'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{ev.title}</h3>
                  {ev.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">{ev.description}</p>
                  )}
                  {ev.image_path && (
                    <img
                      src={resolveBackendPublicUrl(ev.image_path)}
                      alt=""
                      className="mt-3 max-h-32 w-full rounded-xl object-cover sm:max-w-xs"
                    />
                  )}
                  <p className="mt-2 text-xs text-primary-600 dark:text-primary-400">Tap for full details</p>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </div>

      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onImageClick={(ev) =>
          setEventImageLightbox([
            {
              id: ev.id,
              title: ev.title,
              image_path: ev.image_path,
              uploaded_at: ev.event_date,
            },
          ])
        }
      />

      {eventImageLightbox && (
        <PhotoLightbox
          photos={eventImageLightbox}
          index={0}
          onClose={() => setEventImageLightbox(null)}
          onIndexChange={() => {}}
          showThumbnails={false}
        />
      )}
    </div>
  );
}
