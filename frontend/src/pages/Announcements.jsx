import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { notificationsApi } from '../services/api';
import { getApiErrorMessage } from '../lib/apiErrorMessage';

export default function Announcements() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    notificationsApi
      .listAnnouncements({ limit: 50, offset: 0 })
      .then((r) => {
        setItems(r.data.items || []);
        setError('');
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Could not load announcements.')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Megaphone className="h-7 w-7 text-primary-600 dark:text-primary-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Announcements</h1>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-soft dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : error ? (
          <p className="px-4 py-8 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">No announcements yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {items.map((a) => (
              <li key={a.id} className="p-4 sm:p-5">
                <h2 className="font-semibold text-gray-900 dark:text-white">{a.title}</h2>
                {a.body && (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    {a.body}
                  </p>
                )}
                <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                  {a.created_at && new Date(a.created_at).toLocaleString()}
                  {a.created_by_username ? ` · ${a.created_by_username}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
