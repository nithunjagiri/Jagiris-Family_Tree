import { useState, useEffect } from 'react';
import { Calendar, Plus } from 'lucide-react';
import { eventsApi } from '../services/api';
import { cn } from '../lib/utils';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [upcoming, setUpcoming] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [event_date, setEventDate] = useState('');
  const [description, setDescription] = useState('');
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

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);
    try {
      await eventsApi.add({ title, event_date, description: description || null });
      setTitle('');
      setEventDate('');
      setDescription('');
      setShowForm(false);
      load();
    } catch (err) {
      setSubmitError(
        err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to add event'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Events</h1>
        <div className="flex flex-wrap items-center gap-3">
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
        </div>
      </div>

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
            {submitError && <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Add'}
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
            {events.map((ev) => (
              <li
                key={ev.id}
                className="flex gap-4 p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <div className="flex shrink-0 flex-col items-center justify-center rounded-xl bg-primary-100 px-3 py-2 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  <span className="text-xs font-medium uppercase">
                    {new Date(ev.event_date).toLocaleDateString(undefined, { month: 'short' })}
                  </span>
                  <span className="text-xl font-bold">
                    {new Date(ev.event_date).getDate()}
                  </span>
                  <span className="text-xs">
                    {new Date(ev.event_date).getFullYear()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{ev.title}</h3>
                  {ev.description && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{ev.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
