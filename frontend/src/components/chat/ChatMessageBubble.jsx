import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import ChatImageGrid from './ChatImageGrid';
import ChatImageLightbox from './ChatImageLightbox';
import ChatReadReceipt from './ChatReadReceipt';

function formatMessageTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function ChatMessageBubble({
  msg,
  mine,
  peerLastReadAt,
  onDelete,
  deleting,
}) {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const deleted = msg.is_deleted || msg.deleted_at;
  const isImage = msg.message_type === 'image' && !deleted;
  const attachments = msg.attachments || [];
  const caption = msg.caption || msg.body;

  return (
    <>
      <div className={cn('group flex items-end gap-1', mine ? 'justify-end' : 'justify-start')}>
        {mine && !deleted ? (
          <button
            type="button"
            onClick={() => onDelete?.(msg.id)}
            disabled={deleting}
            className="mb-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            aria-label="Delete message"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span className="w-7 shrink-0" />
        )}
        <div
          className={cn(
            'max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm sm:max-w-[70%]',
            deleted
              ? 'bg-gray-50 italic text-gray-500 dark:bg-gray-800/50 dark:text-gray-400'
              : mine
                ? 'rounded-br-md bg-primary-600 text-white'
                : 'rounded-bl-md bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100',
            isImage && 'px-2 pb-2 pt-2'
          )}
        >
          {deleted ? (
            <p className="whitespace-pre-wrap break-words px-1">This message was deleted</p>
          ) : isImage ? (
            <div className="space-y-1">
              <ChatImageGrid attachments={attachments} onImageClick={setLightboxIndex} />
              {caption ? (
                <p className="whitespace-pre-wrap break-words px-1 pt-1 text-sm">{caption}</p>
              ) : null}
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words px-1">{msg.body}</p>
          )}
          <div
            className={cn(
              'mt-1 flex items-center justify-end gap-1 px-1 text-[10px]',
              deleted
                ? 'text-gray-400'
                : mine
                  ? 'text-primary-100'
                  : 'text-gray-500 dark:text-gray-400'
            )}
          >
            <span>{formatMessageTime(msg.created_at)}</span>
            {mine && !deleted ? (
              <ChatReadReceipt createdAt={msg.created_at} peerLastReadAt={peerLastReadAt} />
            ) : null}
            {msg._pending ? <span className="opacity-70"> · Sending…</span> : null}
          </div>
        </div>
      </div>
      {lightboxIndex != null && isImage ? (
        <ChatImageLightbox
          attachments={attachments}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </>
  );
}
