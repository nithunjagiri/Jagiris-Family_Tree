import { useEffect, useState } from 'react';
import { Megaphone, Trash2, Send } from 'lucide-react';
import { notificationsApi } from '../services/api';
import { getApiErrorMessage } from '../lib/apiErrorMessage';

export default function AdminAnnouncements() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetAudience, setTargetAudience] = useState('all');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const limit = 20;

  const load = () => {
    setLoading(true);
    notificationsApi
      .listAnnouncements({ limit, offset })
      .then((r) => {
        setItems(r.data.items || []);
        setTotal(r.data.total ?? 0);
        setError('');
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Could not load announcements.')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [offset]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSending(true);
    setError('');
    setSuccess('');
    try {
      await notificationsApi.createAnnouncement({
        title: title.trim(),
        body: body.trim() || undefined,
        target_audience: targetAudience,
      });
      setTitle('');
      setBody('');
      setTargetAudience('all');
      setSuccess('Announcement sent successfully!');
      setOffset(0);
      load();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to send announcement.'));
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await notificationsApi.deleteAnnouncement(id);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete announcement.'));
    }
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-6">
      {/* Create announcement form */}
      <form
        onSubmit={handleSend}
        className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <Send className="h-5 w-5 text-primary-600" />
          Send Announcement
        </h2>
        <div className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Announcement title *"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Details (optional)"
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
          <div>
            <label htmlFor="announcement-audience" className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              Send to
            </label>
            <select
              id="announcement-audience"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All family members</option>
              <option value="admins">Admins only</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={sending || !title.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {sending ? 'Sending...' : targetAudience === 'admins' ? 'Send to admins' : 'Send to all family members'}
          </button>
        </div>
      </form>

      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-300">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Announcements list */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-700">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
            <Megaphone className="h-5 w-5 text-primary-600" />
            Sent Announcements
            <span className="ml-1 text-xs font-normal text-gray-500">({total})</span>
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No announcements yet.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {items.map((a) => (
              <li key={a.id} className="flex items-start justify-between px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{a.title}</p>
                  {a.body && (
                    <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{a.body}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    {a.created_by_username && `by ${a.created_by_username} · `}
                    {a.target_audience === 'admins' && 'admins only · '}
                    {a.created_at ? new Date(a.created_at).toLocaleString() : ''}
                    {a.sent_at && ' · Delivered'}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="ml-3 rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 dark:border-gray-700">
            <button
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
              className="rounded border px-3 py-1 text-sm disabled:opacity-40 dark:border-gray-600 dark:text-gray-300"
            >
              Previous
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={offset + limit >= total}
              onClick={() => setOffset((o) => o + limit)}
              className="rounded border px-3 py-1 text-sm disabled:opacity-40 dark:border-gray-600 dark:text-gray-300"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
