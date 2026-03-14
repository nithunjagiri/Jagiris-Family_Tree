import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Image, Calendar } from 'lucide-react';
import { familyMembersApi, photosApi, eventsApi } from '../services/api';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const [membersCount, setMembersCount] = useState(0);
  const [recentPhotos, setRecentPhotos] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [membersRes, photosRes, eventsRes] = await Promise.all([
          familyMembersApi.list(),
          photosApi.list(),
          eventsApi.list(true),
        ]);
        if (!cancelled) {
          setMembersCount(membersRes.data?.length ?? 0);
          setRecentPhotos((photosRes.data || []).slice(0, 4));
          setUpcomingEvents((eventsRes.data || []).slice(0, 5));
        }
      } catch (_) {
        if (!cancelled) setMembersCount(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Total Family Members */}
        <Link
          to="/family-members"
          className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-soft transition-shadow hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:shadow-soft-dark"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Family Members</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{membersCount}</p>
            </div>
          </div>
        </Link>

        {/* Card 2: Recent Photos */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900 dark:shadow-soft-dark sm:col-span-2 lg:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">Recent Photos</h2>
            <Link to="/gallery" className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {recentPhotos.length === 0 && (
              <p className="col-span-2 text-sm text-gray-500 dark:text-gray-400">No photos yet</p>
            )}
            {recentPhotos.map((p) => (
              <Link
                key={p.id}
                to="/gallery"
                className="aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
              >
                <img
                  src={p.image_path}
                  alt={p.title}
                  className="h-full w-full object-cover transition-transform hover:scale-105"
                />
              </Link>
            ))}
          </div>
        </div>

        {/* Card 3: Upcoming Events - Timeline */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900 dark:shadow-soft-dark lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">Upcoming Events</h2>
            <Link to="/events" className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
              View all
            </Link>
          </div>
          <ul className="space-y-4">
            {upcomingEvents.length === 0 && (
              <li className="text-sm text-gray-500 dark:text-gray-400">No upcoming events</li>
            )}
            {upcomingEvents.map((e) => (
              <li key={e.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-primary-500" />
                  <div className="mt-1 h-full w-px bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="flex-1 pb-4">
                  <p className="font-medium text-gray-900 dark:text-white">{e.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(e.event_date).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  {e.description && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{e.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
