import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  UserPlus,
  Heart,
  Calendar,
  Megaphone,
  Cake,
  Gem,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useNotificationFeed, formatNotificationTime } from '../hooks/useNotificationFeed';

function iconForType(type) {
  switch (type) {
    case 'member_added':
      return UserPlus;
    case 'member_deceased':
      return Heart;
    case 'event_added':
      return Calendar;
    case 'announcement':
      return Megaphone;
    case 'birthday':
      return Cake;
    case 'anniversary':
      return Gem;
    default:
      return Bell;
  }
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { items, unreadCount, markRead, markAllRead, refresh } = useNotificationFeed(true);

  const badge = unreadCount > 9 ? '9+' : String(unreadCount);

  const handleItemClick = async (item) => {
    if (!item.read_at) await markRead(item.id);
    setOpen(false);
    const path = item.link_path;
    const scrollToAnnouncements =
      path === '/announcements' ||
      path === '/#dashboard-announcements' ||
      path?.endsWith('#dashboard-announcements');
    if (scrollToAnnouncements) {
      navigate('/', { state: { scrollTo: 'dashboard-announcements' } });
    } else if (path) {
      navigate(path);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (!open) refresh();
          setOpen((o) => !o);
        }}
        className="relative touch-manipulation rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/40 md:bg-black/20"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            className={cn(
              'z-[70] flex flex-col overflow-hidden border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800',
              'max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[min(85vh,32rem)] max-md:rounded-t-2xl max-md:border-b-0 max-md:pb-safe',
              'md:absolute md:right-0 md:top-full md:mt-1 md:w-[min(100vw-2rem,22rem)] md:rounded-xl md:shadow-lg'
            )}
          >
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-gray-300 dark:bg-gray-600 md:hidden" />
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</p>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllRead()}
                    className="touch-manipulation text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="touch-manipulation rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 md:hidden dark:hover:bg-gray-700"
                  aria-label="Close notifications"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
              {items.length === 0 && (
                <li className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  No notifications yet
                </li>
              )}
              {items.map((item) => {
                const Icon = iconForType(item.type);
                const unread = !item.read_at;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleItemClick(item)}
                      className={cn(
                        'flex w-full gap-3 px-4 py-3.5 text-left transition-colors touch-manipulation active:bg-gray-100 dark:active:bg-gray-700/50',
                        unread && 'bg-primary-50/50 dark:bg-primary-950/20'
                      )}
                    >
                      <div
                        className={cn(
                          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                          unread
                            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'text-sm leading-snug',
                            unread
                              ? 'font-semibold text-gray-900 dark:text-white'
                              : 'font-medium text-gray-700 dark:text-gray-300'
                          )}
                        >
                          {item.title}
                        </p>
                        {item.body && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{item.body}</p>
                        )}
                        <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                          {formatNotificationTime(item.created_at)}
                        </p>
                      </div>
                      {unread && (
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-600" aria-hidden />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
