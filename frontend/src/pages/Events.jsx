import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { eventsApi, familyMembersApi } from '../services/api';
import { getApiErrorMessage } from '../lib/apiErrorMessage';
import { eventCalendarParts } from '../lib/calendarDate';
import { resolveBackendPublicUrl } from '../lib/backendOrigin';
import { upcomingFamilyDates } from '../lib/dashboardAnalytics';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import {
  absoluteOccasionTiming,
  anniversaryWishTextForTiming,
  birthdayWishTextForTiming,
  senderDisplayName,
} from '../lib/wishMessages';
import ModulePageHeader from '../components/ModulePageHeader';
import EventForm from '../components/EventForm';
import WishActions from '../components/WishActions';

export default function Events() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'birthdays' ? 'birthdays' : 'events';

  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [upcoming, setUpcoming] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [datesLoading, setDatesLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setTab = (next) => {
    const nextParams = new URLSearchParams(searchParams);
    if (next === 'birthdays') nextParams.set('tab', 'birthdays');
    else nextParams.delete('tab');
    setSearchParams(nextParams, { replace: true });
  };

  const loadEvents = () => {
    setEventsLoading(true);
    eventsApi
      .list(upcoming)
      .then((r) => setEvents(r.data || []))
      .finally(() => setEventsLoading(false));
  };

  useEffect(() => {
    if (tab !== 'events') return;
    loadEvents();
  }, [tab, upcoming]);

  useEffect(() => {
    if (tab !== 'birthdays') return;
    let cancelled = false;
    setDatesLoading(true);
    familyMembersApi
      .list()
      .then((r) => {
        if (!cancelled) setMembers(Array.isArray(r.data) ? r.data : []);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      })
      .finally(() => {
        if (!cancelled) setDatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const familyDates = useMemo(() => upcomingFamilyDates(members, 60), [members]);

  const handleAdd = async (data, imageFile) => {
    setSubmitError('');
    setSubmitting(true);
    try {
      const res = await eventsApi.add(data, imageFile);
      setShowForm(false);
      loadEvents();
      if (res.data?.id) {
        navigate(`/events/${res.data.id}`);
      }
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, 'Failed to add event'));
    } finally {
      setSubmitting(false);
    }
  };

  const tabClass = (active) =>
    cn(
      'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
      active
        ? 'bg-primary-600 text-white'
        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
    );

  return (
    <div className="space-y-6 pb-safe">
      <ModulePageHeader
        label="Events"
        stackActionsOnMobile
        actions={
          tab === 'events' ? (
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
          ) : null
        }
      />

      <div className="flex flex-wrap gap-2">
        <button type="button" className={tabClass(tab === 'birthdays')} onClick={() => setTab('birthdays')}>
          Birthdays & anniversaries
        </button>
        <button type="button" className={tabClass(tab === 'events')} onClick={() => setTab('events')}>
          Events
        </button>
      </div>

      {tab === 'events' && showForm && (
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

      {tab === 'birthdays' ? (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-soft dark:border-gray-800 dark:bg-gray-900 dark:shadow-soft-dark">
          {datesLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {familyDates.length === 0 ? (
                <li className="py-12 text-center text-gray-500 dark:text-gray-400">
                  No upcoming birthdays or anniversaries in the next 60 days.
                </li>
              ) : (
                familyDates.map((item) => {
                  const parts = eventCalendarParts(item.nextYmd);
                  const occasionTiming = absoluteOccasionTiming(item.nextYmd);
                  const wishText =
                    item.type === 'anniversary'
                      ? anniversaryWishTextForTiming(item.title, senderDisplayName(user), occasionTiming)
                      : birthdayWishTextForTiming(item.title, senderDisplayName(user), occasionTiming);
                  return (
                    <li key={item.key} className="flex gap-4 p-4">
                      <Link
                        to={`/family-members/${item.member.id}`}
                        className="flex min-w-0 flex-1 gap-4"
                      >
                        <div className="flex shrink-0 flex-col items-center justify-center rounded-xl bg-primary-100 px-3 py-2 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                          <span className="text-xs font-medium uppercase">{parts?.monthShort ?? '—'}</span>
                          <span className="text-xl font-bold">{parts?.day ?? '—'}</span>
                          <span className="text-xs">{parts?.year ?? '—'}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {item.type === 'anniversary' ? 'Anniversary' : 'Birthday'}
                            {parts?.weekdayLong ? ` · ${parts.weekdayLong}` : ''}
                          </p>
                        </div>
                      </Link>
                      <div className="flex shrink-0 flex-col items-end justify-center gap-1.5 self-center">
                        {occasionTiming ? (
                          <WishActions compact member={item.member} message={wishText} />
                        ) : null}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-soft dark:border-gray-800 dark:bg-gray-900 dark:shadow-soft-dark">
          {eventsLoading ? (
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
      )}
    </div>
  );
}
