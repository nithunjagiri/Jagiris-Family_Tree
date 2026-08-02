import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { eventsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { eventCalendarParts, formatCalendarLong } from '../lib/calendarDate';
import { resolveBackendPublicUrl } from '../lib/backendOrigin';
import { getApiErrorMessage } from '../lib/apiErrorMessage';
import { canDeleteEvent, canEditEvent, isEventUpcoming } from '../lib/eventPermissions';
import { useAppBackNavigation } from '../hooks/useAppBackNavigation';
import { getNavigationOriginPath } from '../lib/navigationOrigin';
import ModulePageHeader from '../components/ModulePageHeader';
import EventForm from '../components/EventForm';
import PhotoLightbox from '../components/PhotoLightbox';

function seedEventFromState(stateEvent, paramId) {
  if (!stateEvent || paramId == null) return null;
  if (String(stateEvent.id) !== String(paramId)) return null;
  return stateEvent;
}

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const returnTo = location.state?.returnTo || getNavigationOriginPath() || '/events';
  const handleBack = useAppBackNavigation(returnTo);
  const seedEvent = useMemo(
    () => seedEventFromState(location.state?.event, id),
    [location.state?.event, id]
  );

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (seedEvent) {
        setEvent(seedEvent);
        setLoading(false);
      } else {
        setEvent(null);
        setLoading(true);
      }
      setError('');

      try {
        const res = await eventsApi.get(id);
        if (!cancelled) setEvent(res.data);
      } catch (err) {
        if (cancelled) return;
        const status = err?.response?.status;
        if (status === 404) {
          setEvent(null);
          setError('Event not found');
        } else if (seedEvent) {
          setEvent(seedEvent);
          setError(getApiErrorMessage(err, 'Could not refresh event details'));
        } else {
          setEvent(null);
          setError(getApiErrorMessage(err, 'Could not load event'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, seedEvent]);

  const handleUpdate = async (data, imageFile) => {
    setSubmitError('');
    setSubmitting(true);
    try {
      const res = await eventsApi.update(id, data, imageFile);
      setEvent(res.data);
      setEditing(false);
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, 'Failed to update event'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await eventsApi.delete(id);
      navigate('/events', { replace: true });
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, 'Failed to delete event'));
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading && !event) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="space-y-4">
        <ModulePageHeader label="Event" />
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">{error || 'Event not found'}</p>
          <Link to="/events" className="mt-4 inline-block text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
            Back to events
          </Link>
        </div>
      </div>
    );
  }

  const parts = eventCalendarParts(event.event_date);
  const showEdit = canEditEvent(event, user);
  const showDelete = canDeleteEvent(event, user);
  const upcoming = isEventUpcoming(event.event_date);

  return (
    <div className="space-y-6 pb-safe">
      <ModulePageHeader
        label="Event details"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {showEdit && !editing && (
              <button
                type="button"
                onClick={() => {
                  setSubmitError('');
                  setEditing(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <Pencil className="h-4 w-4" aria-hidden />
                Edit
              </button>
            )}
            {showDelete && !editing && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Delete
              </button>
            )}
          </div>
        }
      />

      {error ? (
        <p className="text-sm text-amber-700 dark:text-amber-400" role="status">
          {error}
        </p>
      ) : null}

      {editing ? (
        <EventForm
          mode="edit"
          heading="Edit event"
          initialValues={event}
          existingImageUrl={event.image_path ? resolveBackendPublicUrl(event.image_path) : null}
          onSubmit={handleUpdate}
          onCancel={() => {
            setEditing(false);
            setSubmitError('');
          }}
          submitLabel="Save changes"
          submitting={submitting}
          error={submitError}
        />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-soft dark:border-gray-800 dark:bg-gray-900 dark:shadow-soft-dark">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex shrink-0 flex-col items-center justify-center rounded-xl bg-primary-100 px-4 py-3 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                <span className="text-xs font-medium uppercase">{parts?.monthShort ?? '—'}</span>
                <span className="text-2xl font-bold tabular-nums">{parts?.day ?? '—'}</span>
                <span className="text-xs tabular-nums">{parts?.year ?? '—'}</span>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">{event.title}</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {formatCalendarLong(event.event_date)}
                  {parts?.weekdayLong ? ` · ${parts.weekdayLong}` : ''}
                  {!upcoming ? ' · Past event' : ' · Upcoming'}
                </p>
                {event.created_by_username && (
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Added by {event.created_by_username}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 px-5 py-5">
            {event.description && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Description</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  {event.description}
                </p>
              </div>
            )}

            {event.image_path && (
              <div>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Photo</h2>
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="block w-full max-w-md overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <img
                    src={resolveBackendPublicUrl(event.image_path)}
                    alt={event.title}
                    className="max-h-80 w-full object-cover"
                  />
                </button>
              </div>
            )}

            {!showEdit && upcoming && showDelete && (
              <p className="text-xs text-gray-500 dark:text-gray-400">Only the creator or an admin can edit this event.</p>
            )}
            {!upcoming && (
              <p className="text-xs text-gray-500 dark:text-gray-400">Past events cannot be edited.</p>
            )}
          </div>
        </div>
      )}

      {submitError && !editing && (
        <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
        >
          Back
        </button>
        <Link
          to="/events"
          className="rounded-lg px-4 py-2 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          All events
        </Link>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div
            className="w-full max-w-md rounded-t-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-900 sm:rounded-2xl max-md:pb-safe"
            role="dialog"
            aria-modal="true"
            aria-label="Confirm delete"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete event?</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              This will permanently remove &ldquo;{event.title}&rdquo;. This action cannot be undone.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxOpen && event.image_path && (
        <PhotoLightbox
          photos={[
            {
              id: event.id,
              title: event.title,
              image_path: event.image_path,
              uploaded_at: event.event_date,
            },
          ]}
          index={0}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={() => {}}
          showThumbnails={false}
        />
      )}
    </div>
  );
}
