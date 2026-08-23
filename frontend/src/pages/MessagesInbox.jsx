import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, User } from 'lucide-react';
import { messagesApi } from '../services/api';
import { getApiErrorMessage } from '../lib/apiErrorMessage';
import { resolveBackendPublicUrl } from '../lib/backendOrigin';
import { useChatSocket } from '../hooks/useChatSocket';
import ModulePageHeader from '../components/ModulePageHeader';
import { cn } from '../lib/utils';

function formatThreadTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function ThreadAvatar({ participant }) {
  const photo = participant?.profile_photo;
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
      {photo ? (
        <img src={resolveBackendPublicUrl(photo)} alt="" className="h-full w-full object-cover" />
      ) : (
        <User className="h-5 w-5" />
      )}
    </div>
  );
}

export default function MessagesInbox() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const { data } = await messagesApi.listThreads();
      setThreads(data.threads || []);
      setError('');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load messages.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useChatSocket({
    onMessage: () => {
      refresh();
    },
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ModulePageHeader label="Messages" />
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-gray-200 bg-white shadow-soft dark:border-gray-800 dark:bg-gray-900 dark:shadow-soft-dark">
        {loading ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600 dark:text-red-400">{error}</div>
        ) : threads.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <MessageSquare className="h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-600 dark:text-gray-400">No conversations yet.</p>
            <p className="max-w-sm text-sm text-gray-500 dark:text-gray-500">
              Open a family member profile and tap Message when they are linked to an app account.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {threads.map((thread) => {
              const other = thread.other_participant;
              const name = other?.display_name || other?.username || 'Family member';
              const unread = Number(thread.unread_count) > 0;
              return (
                <li key={thread.id}>
                  <Link
                    to={`/messages/${thread.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  >
                    <ThreadAvatar participant={other} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn('truncate font-medium', unread ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-200')}>
                          {name}
                        </p>
                        <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                          {formatThreadTime(thread.last_message_at)}
                        </span>
                      </div>
                      <p className={cn('truncate text-sm', unread ? 'font-medium text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400')}>
                        {thread.last_message_preview || 'No messages yet'}
                      </p>
                    </div>
                    {unread ? (
                      <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary-600 px-1.5 text-xs font-semibold text-white">
                        {thread.unread_count > 9 ? '9+' : thread.unread_count}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
