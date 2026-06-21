import { X } from 'lucide-react';
import { eventCalendarParts } from '../lib/calendarDate';
import { resolveBackendPublicUrl } from '../lib/backendOrigin';

export default function EventDetailModal({ event, onClose, onImageClick }) {
  if (!event) return null;

  const parts = eventCalendarParts(event.event_date);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Event details"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Event details</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex gap-4">
            <div className="flex shrink-0 flex-col items-center justify-center rounded-xl bg-primary-100 px-3 py-2 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
              <span className="text-xs font-medium uppercase">{parts?.monthShort ?? '—'}</span>
              <span className="text-2xl font-bold">{parts?.day ?? '—'}</span>
              <span className="text-xs">{parts?.year ?? '—'}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{event.title}</h3>
              {event.description && (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  {event.description}
                </p>
              )}
            </div>
          </div>

          {event.image_path && (
            <button
              type="button"
              onClick={() => onImageClick?.(event)}
              className="mt-4 block w-full overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <img
                src={resolveBackendPublicUrl(event.image_path)}
                alt={event.title}
                className="max-h-80 w-full object-cover"
              />
              <p className="mt-1 text-center text-xs text-gray-500 dark:text-gray-400">Tap to view full size</p>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
