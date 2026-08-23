import { useCallback, useEffect, useState } from 'react';
import { Archive } from 'lucide-react';
import { messagesApi } from '../services/api';
import { getApiErrorMessage } from '../lib/apiErrorMessage';
import { useChatSocket } from '../hooks/useChatSocket';
import ModulePageHeader from '../components/ModulePageHeader';
import InboxThreadRow from '../components/chat/InboxThreadRow';
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

export default function MessagesInbox() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [actionId, setActionId] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await messagesApi.listThreads({
        archived: showArchived ? '1' : '0',
      });
      setThreads(data.threads || []);
      setError('');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load messages.'));
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  useChatSocket({
    onMessage: () => {
      refresh();
    },
  });

  const handleArchive = async (threadId) => {
    setActionId(threadId);
    setError('');
    try {
      await messagesApi.archiveThread(threadId);
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not archive chat.'));
    } finally {
      setActionId(null);
    }
  };

  const handleUnarchive = async (threadId) => {
    setActionId(threadId);
    setError('');
    try {
      await messagesApi.unarchiveThread(threadId);
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not unarchive chat.'));
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteChat = async (threadId) => {
    if (
      !window.confirm(
        'Delete this chat? Messages will be removed from your inbox. The other person will still have their copy.'
      )
    ) {
      return;
    }
    setActionId(threadId);
    setError('');
    try {
      await messagesApi.deleteChat(threadId);
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not delete chat.'));
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <ModulePageHeader label="Messages" />
      <div className="mb-2 flex shrink-0 justify-end px-1">
        <button
          type="button"
          onClick={() => setShowArchived((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            showArchived
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
          )}
        >
          <Archive className="h-4 w-4" />
          {showArchived ? 'Back to chats' : 'Archived'}
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-gray-200 bg-white shadow-soft dark:border-gray-800 dark:bg-gray-900 dark:shadow-soft-dark">
        {loading ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600 dark:text-red-400">{error}</div>
        ) : threads.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <Archive className="h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-600 dark:text-gray-400">
              {showArchived ? 'No archived chats.' : 'No conversations yet.'}
            </p>
            {!showArchived ? (
              <p className="max-w-sm text-sm text-gray-500 dark:text-gray-500">
                Open a family member profile and tap Message when they are linked to an app account.
              </p>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {threads.map((thread) => (
              <InboxThreadRow
                key={thread.id}
                thread={thread}
                formatThreadTime={formatThreadTime}
                archivedView={showArchived}
                onArchive={handleArchive}
                onUnarchive={handleUnarchive}
                onDelete={handleDeleteChat}
                busy={actionId === thread.id}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
