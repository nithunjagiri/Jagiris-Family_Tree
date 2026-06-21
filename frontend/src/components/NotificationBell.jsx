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
  const { items, unreadCount, markRead, markAllRead } = useNotificationFeed(true);

  const badge = unreadCount > 9 ? '9+' : String(unreadCount);

  const handleItemClick = async (item) => {
    if (!item.read_at) await markRead(item.id);
    setOpen(false);
    if (item.link_path) navigate(item.link_path);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
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
          <div className="fixed inset-0 z-10" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</p>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead()}
                  className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
                >
                  Mark all read
                </button>
              )}
            </div>
            <ul className="max-h-[min(70vh,24rem)] overflow-y-auto">
              {items.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
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
                        'flex w-full gap-3 px-3 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50',
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
                          <p className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                            {item.body}
                          </p>
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
