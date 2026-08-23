import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Send, User, Smile, Trash2, MoreVertical } from 'lucide-react';
import { messagesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../lib/apiErrorMessage';
import { resolveBackendPublicUrl } from '../lib/backendOrigin';
import { useChatSocket } from '../hooks/useChatSocket';
import { useAppBackNavigation } from '../hooks/useAppBackNavigation';
import ChatEmojiPicker from '../components/ChatEmojiPicker';
import { cn } from '../lib/utils';

function formatMessageTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function applyDeletedMessage(messages, payload) {
  const msg = payload?.message;
  if (!msg?.id) return messages;
  return messages.map((m) => (m.id === msg.id ? { ...m, ...msg, is_deleted: true, body: null } : m));
}

export default function ChatThread() {
  const { threadId } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const returnTo = location.state?.returnTo || '/messages';
  const handleBack = useAppBackNavigation(returnTo);
  const [messages, setMessages] = useState([]);
  const [otherParticipant, setOtherParticipant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const menuRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      const [msgRes, threadRes] = await Promise.all([
        messagesApi.listMessages(threadId, { limit: 50 }),
        messagesApi.listThreads(),
      ]);
      setMessages(msgRes.data.messages || []);
      const thread = (threadRes.data.threads || []).find((t) => String(t.id) === String(threadId));
      setOtherParticipant(thread?.other_participant || null);
      setError('');
      await messagesApi.markRead(threadId);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load conversation.'));
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    setLoading(true);
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  useChatSocket({
    threadId,
    onMessage: (payload) => {
      if (String(payload?.conversation_id) !== String(threadId)) return;
      const msg = payload?.message;
      if (!msg?.id) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      messagesApi.markRead(threadId).catch(() => {});
    },
    onMessageDeleted: (payload) => {
      if (String(payload?.conversation_id) !== String(threadId)) return;
      setMessages((prev) => applyDeletedMessage(prev, payload));
    },
  });

  useEffect(() => {
    pollRef.current = setInterval(() => {
      messagesApi
        .listMessages(threadId, { limit: 50 })
        .then((res) => setMessages(res.data.messages || []))
        .catch(() => {});
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [threadId]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft('');
    setEmojiOpen(false);
    try {
      const { data } = await messagesApi.send(threadId, text);
      const msg = data.message;
      if (msg) {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      }
    } catch (err) {
      setDraft(text);
      setError(getApiErrorMessage(err, 'Could not send message.'));
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message for everyone in this chat?')) return;
    setDeletingId(messageId);
    setError('');
    try {
      const { data } = await messagesApi.deleteMessage(threadId, messageId);
      if (data?.message) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.message.id ? { ...m, ...data.message, is_deleted: true, body: null } : m
          )
        );
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not delete message.'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearChat = async () => {
    if (!window.confirm('Clear this chat on your device? Messages will be hidden for you only.')) return;
    setClearing(true);
    setMenuOpen(false);
    setError('');
    try {
      await messagesApi.clearThread(threadId);
      setMessages([]);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not clear chat.'));
    } finally {
      setClearing(false);
    }
  };

  const insertEmoji = (emoji) => {
    setDraft((prev) => `${prev}${emoji}`);
  };

  const otherName = otherParticipant?.display_name || otherParticipant?.username || 'Chat';
  const otherPhoto = otherParticipant?.profile_photo;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 dark:bg-primary-900/30">
            {otherPhoto ? (
              <img src={resolveBackendPublicUrl(otherPhoto)} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-gray-900 dark:text-white">{otherName}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Private conversation</p>
          </div>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
            aria-label="Chat options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
              <button
                type="button"
                onClick={handleClearChat}
                disabled={clearing}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-gray-700"
              >
                <Trash2 className="h-4 w-4" />
                {clearing ? 'Clearing…' : 'Clear chat'}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-soft dark:border-gray-800 dark:bg-gray-900 dark:shadow-soft-dark">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {error ? <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p> : null}
              {messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  Say hello to start the conversation.
                </p>
              ) : (
                messages.map((msg) => {
                  const mine = Number(msg.sender_user_id) === Number(user?.id);
                  const deleted = msg.is_deleted || msg.deleted_at;
                  return (
                    <div key={msg.id} className={cn('group flex items-end gap-1', mine ? 'justify-end' : 'justify-start')}>
                      {mine && !deleted ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(msg.id)}
                          disabled={deletingId === msg.id}
                          className="mb-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                          aria-label="Delete message"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <span className="w-7 shrink-0" />
                      )}
                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm sm:max-w-[70%]',
                          deleted
                            ? 'bg-gray-50 italic text-gray-500 dark:bg-gray-800/50 dark:text-gray-400'
                            : mine
                              ? 'rounded-br-md bg-primary-600 text-white'
                              : 'rounded-bl-md bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">
                          {deleted ? 'This message was deleted' : msg.body}
                        </p>
                        <p
                          className={cn(
                            'mt-1 text-[10px]',
                            deleted
                              ? 'text-gray-400'
                              : mine
                                ? 'text-primary-100'
                                : 'text-gray-500 dark:text-gray-400'
                          )}
                        >
                          {formatMessageTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={handleSend}
              className="relative flex items-end gap-2 border-t border-gray-200 p-3 pb-safe dark:border-gray-700"
            >
              <div className="relative flex min-w-0 flex-1 items-end gap-1">
                <button
                  type="button"
                  onClick={() => setEmojiOpen((o) => !o)}
                  className={cn(
                    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors',
                    emojiOpen
                      ? 'border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
                  )}
                  aria-label="Open emoji picker"
                >
                  <Smile className="h-5 w-5" />
                </button>
                <ChatEmojiPicker
                  open={emojiOpen}
                  onClose={() => setEmojiOpen(false)}
                  onSelect={insertEmoji}
                  className="left-0"
                />
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                  rows={1}
                  placeholder="Type a message…"
                  maxLength={2000}
                  className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={!draft.trim() || sending}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
