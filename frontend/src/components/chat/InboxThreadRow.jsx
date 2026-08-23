import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, ArchiveRestore, MoreVertical, Trash2, User } from 'lucide-react';
import { resolveBackendPublicUrl } from '../../lib/backendOrigin';
import { useLongPress } from '../../hooks/useLongPress';
import { cn } from '../../lib/utils';

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

function ThreadActionSheet({ open, archived, onClose, onArchive, onUnarchive, onDelete }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-sm rounded-t-2xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-900 sm:rounded-2xl"
        role="menu"
      >
        {archived ? (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onUnarchive();
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            <ArchiveRestore className="h-5 w-5 text-gray-500" />
            Unarchive
          </button>
        ) : (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onArchive();
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            <Archive className="h-5 w-5 text-gray-500" />
            Archive
          </button>
        )}
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onDelete();
            onClose();
          }}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <Trash2 className="h-5 w-5" />
          Delete chat
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-1 w-full rounded-xl px-4 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function InboxThreadRow({
  thread,
  formatThreadTime,
  archivedView,
  onArchive,
  onUnarchive,
  onDelete,
  busy,
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const suppressClickRef = useRef(false);

  const other = thread.other_participant;
  const name = other?.display_name || other?.username || 'Family member';
  const unread = Number(thread.unread_count) > 0;

  const openMenu = () => {
    suppressClickRef.current = true;
    setMenuOpen(true);
  };

  const pressHandlers = useLongPress(openMenu, {
    delay: 500,
    onClick: () => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }
      navigate(`/messages/${thread.id}`);
    },
  });

  const closeMenu = () => {
    setMenuOpen(false);
    setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  };

  return (
    <>
      <li
        className={cn(
          'relative select-none',
          menuOpen && 'z-10 bg-gray-50 dark:bg-gray-800/60',
          busy && 'pointer-events-none opacity-60'
        )}
      >
        <div
          {...pressHandlers}
          className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-800/60 dark:active:bg-gray-800"
        >
          <ThreadAvatar participant={other} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p
                className={cn(
                  'truncate font-medium',
                  unread ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-200'
                )}
              >
                {name}
              </p>
              <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                {formatThreadTime(thread.last_message_at)}
              </span>
            </div>
            <p
              className={cn(
                'truncate text-sm',
                unread ? 'font-medium text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'
              )}
            >
              {thread.last_message_preview || 'No messages yet'}
            </p>
          </div>
          {unread ? (
            <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary-600 px-1.5 text-xs font-semibold text-white">
              {thread.unread_count > 9 ? '9+' : thread.unread_count}
            </span>
          ) : null}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              openMenu();
            }}
            className="ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200/80 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            aria-label="Chat options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </li>

      <ThreadActionSheet
        open={menuOpen}
        archived={archivedView}
        onClose={closeMenu}
        onArchive={() => onArchive(thread.id)}
        onUnarchive={() => onUnarchive(thread.id)}
        onDelete={() => onDelete(thread.id)}
      />
    </>
  );
}
