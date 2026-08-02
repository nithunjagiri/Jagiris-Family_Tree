import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { eventsApi } from '../services/api';
import { getApiErrorMessage } from '../lib/apiErrorMessage';
import { eventCalendarParts } from '../lib/calendarDate';
import { resolveBackendPublicUrl } from '../lib/backendOrigin';
import ModulePageHeader from '../components/ModulePageHeader';
import EventForm from '../components/EventForm';

export default function Events() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [upcoming, setUpcoming] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleAdd = async (data, imageFile) => {
    setSubmitError('');
    setSubmitting(true);
    try {
      const res = await eventsApi.add(data, imageFile);
      setShowForm(false);
      load();
      if (res.data?.id) {
        navigate(`/events/${res.data.id}`);
      }
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, 'Failed to add event'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-safe">
      <ModulePageHeader
        label="Events"
        stackActionsOnMobile
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
              onClick={() => {
                setSubmitError('');
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-primary-700"
            >
              <Plus className="h-5 w-5" />
              Add Event
            </button>
          </>
        }
      />

      {showForm && (
        <EventForm
          mode="add"
          heading="Add event"
          onSubmit={handleAdd}
          onCancel={() => {
            setShowForm(false);
            setSubmitError('');
          }}
          submitLabel="Add"
          submitting={submitting}
          error={submitError}
        />
      )}

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
                  onClick={() =>
                    navigate(`/events/${ev.id}`, { state: { event: ev, returnTo: '/events' } })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/events/${ev.id}`, { state: { event: ev, returnTo: '/events' } });
                    }
                  }}
                  className="flex cursor-pointer gap-4 p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <div className="flex shrink-0 flex-col items-center justify-center rounded-xl bg-primary-100 px-3 py-2 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                    <span className="text-xs font-medium uppercase">{parts?.monthShort ?? '—'}</span>
                    <span className="text-xl font-bold">{parts?.day ?? '—'}</span>
                    <span className="text-xs">{parts?.year ?? '—'}</span>
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
    </div>
  );
}
