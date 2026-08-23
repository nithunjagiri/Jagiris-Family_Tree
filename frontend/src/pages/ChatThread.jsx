import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Trash2, User } from 'lucide-react';
import { messagesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../lib/apiErrorMessage';
import { resolveBackendPublicUrl } from '../lib/backendOrigin';
import { useChatSocket } from '../hooks/useChatSocket';
import { clearChatAttachmentCache } from '../lib/chatAttachmentLoader';
import ChatComposer from '../components/chat/ChatComposer';
import ChatMessageBubble from '../components/chat/ChatMessageBubble';

function applyDeletedMessage(messages, payload) {
  const msg = payload?.message;
  if (!msg?.id) return messages;
  return messages.map((m) =>
    m.id === msg.id
      ? { ...m, ...msg, is_deleted: true, body: null, caption: null, attachments: [] }
      : m
  );
}

function mergeServerMessages(serverMessages, pendingLocal) {
  const serverIds = new Set(serverMessages.map((m) => m.id).filter(Boolean));
  const stillPending = pendingLocal.filter((m) => !m.id || !serverIds.has(m.id));
  const combined = [...serverMessages];
  for (const pending of stillPending) {
    if (!combined.some((m) => m.clientId && m.clientId === pending.clientId)) {
      combined.push(pending);
    }
  }
  return combined.sort((a, b) => {
    const ta = new Date(a.created_at || 0).getTime();
    const tb = new Date(b.created_at || 0).getTime();
    if (ta !== tb) return ta - tb;
    return (a.id || 0) - (b.id || 0);
  });
}

export default function ChatThread() {
  const { threadId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const returnTo = location.state?.returnTo || '/messages';
  const handleBack = useCallback(() => {
    navigate(returnTo, { replace: true });
  }, [navigate, returnTo]);
  const [messages, setMessages] = useState([]);
  const [otherParticipant, setOtherParticipant] = useState(null);
  const [peerLastReadAt, setPeerLastReadAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [pendingItems, setPendingItems] = useState([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const menuRef = useRef(null);
  const pendingMessagesRef = useRef([]);
  const uploadingRef = useRef(false);

  useEffect(() => {
    uploadingRef.current = uploading;
  }, [uploading]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      const [msgRes, threadRes] = await Promise.all([
        messagesApi.listMessages(threadId, { limit: 50 }),
        messagesApi.listThreads(),
      ]);
      const serverMessages = msgRes.data.messages || [];
      setMessages(mergeServerMessages(serverMessages, pendingMessagesRef.current));
      if (msgRes.data.peer_last_read_at != null) {
        setPeerLastReadAt(msgRes.data.peer_last_read_at);
      }
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
    return () => clearChatAttachmentCache();
  }, [threadId]);

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
        const withoutMatchingPending = prev.filter(
          (m) => !(m._pending && m.sender_user_id === msg.sender_user_id && m.message_type === msg.message_type)
        );
        return [...withoutMatchingPending, msg];
      });
      pendingMessagesRef.current = pendingMessagesRef.current.filter((m) => m.id !== msg.id);
      messagesApi.markRead(threadId).catch(() => {});
    },
    onMessageDeleted: (payload) => {
      if (String(payload?.conversation_id) !== String(threadId)) return;
      setMessages((prev) => applyDeletedMessage(prev, payload));
    },
    onThreadRead: (payload) => {
      if (String(payload?.conversation_id) !== String(threadId)) return;
      if (payload?.last_read_at) setPeerLastReadAt(payload.last_read_at);
    },
  });

  useEffect(() => {
    pollRef.current = setInterval(() => {
      if (uploadingRef.current) return;
      messagesApi
        .listMessages(threadId, { limit: 50 })
        .then((res) => {
          const serverMessages = res.data.messages || [];
          setMessages(mergeServerMessages(serverMessages, pendingMessagesRef.current));
          if (res.data.peer_last_read_at != null) {
            setPeerLastReadAt(res.data.peer_last_read_at);
          }
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [threadId]);

  const handleSendText = async (text) => {
    if (!text || sending) return;
    setSending(true);
    setDraft('');
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

  const handleSendImages = async (items, caption) => {
    if (!items?.length || uploading) return;
    setUploading(true);
    setError('');

    const clientId = `pending-${Date.now()}`;
    const optimistic = {
      clientId,
      _pending: true,
      id: null,
      conversation_id: Number(threadId),
      sender_user_id: user?.id,
      message_type: 'image',
      body: caption || null,
      caption: caption || null,
      created_at: new Date().toISOString(),
      attachments: items.map((item, index) => ({
        id: `local-${clientId}-${index}`,
        localPreview: URL.createObjectURL(item.file),
        sort_order: index,
      })),
    };
    pendingMessagesRef.current = [...pendingMessagesRef.current, optimistic];
    setMessages((prev) => [...prev, optimistic]);
    setPendingItems([]);

    try {
      const { data } = await messagesApi.sendImages(threadId, items, caption);
      const msg = data.message;
      if (msg) {
        optimistic.attachments?.forEach((a) => {
          if (a.localPreview) URL.revokeObjectURL(a.localPreview);
        });
        pendingMessagesRef.current = pendingMessagesRef.current.filter((m) => m.clientId !== clientId);
        setMessages((prev) => {
          const without = prev.filter((m) => m.clientId !== clientId);
          if (without.some((m) => m.id === msg.id)) return without;
          return [...without, msg];
        });
      }
    } catch (err) {
      pendingMessagesRef.current = pendingMessagesRef.current.filter((m) => m.clientId !== clientId);
      setMessages((prev) => prev.filter((m) => m.clientId !== clientId));
      if (caption) setDraft(caption);
      setPendingItems(items);
      setError(getApiErrorMessage(err, 'Could not send images.'));
    } finally {
      setUploading(false);
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
            m.id === data.message.id
              ? { ...m, ...data.message, is_deleted: true, body: null, caption: null, attachments: [] }
              : m
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
      pendingMessagesRef.current = [];
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not clear chat.'));
    } finally {
      setClearing(false);
    }
  };

  const otherName = otherParticipant?.display_name || otherParticipant?.username || 'Chat';
  const otherPhoto = otherParticipant?.profile_photo;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="mb-2 flex shrink-0 items-center gap-2 sm:mb-3 sm:gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex touch-manipulation items-center gap-2 rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 sm:px-3"
          aria-label="Back to messages"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back</span>
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
                messages.map((msg) => (
                  <ChatMessageBubble
                    key={msg.clientId || msg.id}
                    msg={msg}
                    mine={Number(msg.sender_user_id) === Number(user?.id)}
                    peerLastReadAt={peerLastReadAt}
                    onDelete={handleDeleteMessage}
                    deleting={deletingId === msg.id}
                  />
                ))
              )}
              <div ref={bottomRef} />
            </div>

            <ChatComposer
              draft={draft}
              onDraftChange={setDraft}
              pendingItems={pendingItems}
              onPendingChange={setPendingItems}
              onSendText={handleSendText}
              onSendImages={handleSendImages}
              sending={sending}
              uploading={uploading}
            />
          </>
        )}
      </div>
    </div>
  );
}
