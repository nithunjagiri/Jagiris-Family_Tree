import { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { adminApi } from '../services/api';
import { getApiErrorMessage } from '../lib/apiErrorMessage';

function formatTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminAudit() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const limit = 40;

  const load = () => {
    setLoading(true);
    adminApi
      .auditLogs({ limit, offset })
      .then((r) => {
        setItems(r.data.items || []);
        setTotal(r.data.total ?? 0);
        setMessage(r.data.message || '');
        setError('');
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, 'Could not load audit log.'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [offset]);

  const maxOffset = Math.max(0, total - limit);
  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin · Audit log</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
          Immutable-style record of sensitive actions (member changes, gallery, events, places, and account events).
          Ensure the database migration for <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">audit_logs</code>{' '}
          has been applied.
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <ClipboardList className="mr-1 inline h-4 w-4 align-text-bottom" />
          {total} entries total
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!canPrev || loading}
            onClick={() => setOffset((o) => Math.max(0, o - limit))}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium disabled:opacity-40 dark:border-gray-600"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={!canNext || loading}
            onClick={() => setOffset((o) => o + limit)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium disabled:opacity-40 dark:border-gray-600"
          >
            Next
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-soft dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">When</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">User</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Action</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Entity</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                    No audit entries yet. Actions you perform after migration will appear here.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-600 dark:text-gray-400">
                      {formatTime(row.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-800 dark:text-gray-200">
                      {row.username || '—'}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-primary-700 dark:text-primary-300">{row.action}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-600 dark:text-gray-400">
                      {row.entity_type || '—'}
                      {row.entity_id != null ? ` #${row.entity_id}` : ''}
                    </td>
                    <td className="max-w-md truncate px-4 py-2.5 text-gray-700 dark:text-gray-300" title={row.summary || ''}>
                      {row.summary || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
