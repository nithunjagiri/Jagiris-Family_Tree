import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, Users, Calendar, Image } from 'lucide-react';
import { searchApi } from '../services/api';
import { formatCalendarLong } from '../lib/calendarDate';
import { HIDE_RELATION_NAMES_IN_UI } from '../lib/appDisplaySettings';
import ModulePageHeader from '../components/ModulePageHeader';

export default function GlobalSearch() {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState({ members: [], events: [], photos: [], query: '' });

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 320);
    return () => clearTimeout(t);
  }, [q]);

  const run = useCallback(() => {
    if (!debounced) {
      setResult({ members: [], events: [], photos: [], query: '' });
      return;
    }
    setLoading(true);
    searchApi
      .search(debounced)
      .then((r) => setResult(r.data))
      .finally(() => setLoading(false));
  }, [debounced]);

  useEffect(() => {
    run();
  }, [run]);

  const hasResults =
    (result.members && result.members.length > 0) ||
    (result.events && result.events.length > 0) ||
    (result.photos && result.photos.length > 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <ModulePageHeader
        label="Search"
        description="Search across family members, events, and gallery titles in one place."
      />

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name, place, event title, photo title…"
          className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 pl-12 pr-4 text-base shadow-soft outline-none ring-primary-500 focus:border-primary-500 focus:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          autoComplete="off"
          aria-label="Search family data"
        />
      </div>

      {loading && debounced && (
        <div className="flex justify-center py-8">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        </div>
      )}

      {!loading && debounced && !hasResults && (
        <p className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          No matches for &ldquo;{debounced}&rdquo;. Try another spelling or a shorter term.
        </p>
      )}

      {!loading && hasResults && (
        <div className="space-y-8">
          {(result.members || []).length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                <Users className="h-5 w-5 text-primary-600" />
                Family members
              </h2>
              <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
                {(result.members || []).map((m) => (
                  <li key={m.id}>
                    <Link
                      to={`/family-members/${m.id}`}
                      className="flex flex-col gap-0.5 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/80"
                    >
                      <span className="font-medium text-primary-700 dark:text-primary-300">
                        {m.name} {m.surname || ''}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {[
                          ...(HIDE_RELATION_NAMES_IN_UI ? [] : [m.relation]),
                          m.birth_place_name || m.birth_place,
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'View profile'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(result.events || []).length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                <Calendar className="h-5 w-5 text-primary-600" />
                Events
              </h2>
              <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
                {(result.events || []).map((ev) => (
                  <li key={ev.id} className="px-4 py-3">
                    <Link to="/events" className="font-medium text-primary-700 hover:underline dark:text-primary-300">
                      {ev.title}
                    </Link>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatCalendarLong(ev.event_date) || String(ev.event_date ?? '')}
                    </p>
                    {ev.description_preview && (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{ev.description_preview}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(result.photos || []).length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                <Image className="h-5 w-5 text-primary-600" />
                Gallery
              </h2>
              <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
                {(result.photos || []).map((ph) => (
                  <li key={ph.id} className="px-4 py-3">
                    <Link to="/gallery" className="font-medium text-primary-700 hover:underline dark:text-primary-300">
                      {ph.title}
                    </Link>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{ph.uploaded_at}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
