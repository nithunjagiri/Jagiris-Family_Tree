import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import { formatCalendarLong, parseCalendarYmd } from '../lib/calendarDate';
import { HIDE_RELATION_NAMES_IN_UI } from '../lib/appDisplaySettings';

function formatDate(d) {
  const p = parseCalendarYmd(d);
  return p ? formatCalendarLong(p.ymd) : null;
}

export default function DuplicateMemberModal({
  open,
  matches,
  dobDiffersFromForm,
  onCancel,
  onProceed,
}) {
  const cancelBtnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => cancelBtnRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Close dialog"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dup-member-title"
        className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-soft dark:border-gray-700 dark:bg-gray-900 dark:shadow-soft-dark"
      >
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h2 id="dup-member-title" className="text-lg font-semibold text-gray-900 dark:text-white">
            Similar member already exists
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Another person with the same name, surname, and gender is already in the family list. They may be a
            different person (e.g. same name in another branch). Review the record below before continuing.
          </p>
          {dobDiffersFromForm && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              At least one match has a different birth date than you entered — they are likely different people.
            </p>
          )}
        </div>

        <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {matches.map((m) => {
            const fullName = [m.name, m.surname].filter(Boolean).join(' ') || 'Member';
            const dob = formatDate(m.date_of_birth);
            const dod = formatDate(m.date_of_death);
            return (
              <li
                key={m.id}
                className="flex gap-4 rounded-xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-800/50"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100 dark:border-gray-600 dark:bg-gray-700">
                  {m.profile_photo ? (
                    <img src={m.profile_photo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400">
                      <User className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold text-gray-900 dark:text-white">{fullName}</p>
                  <dl className="mt-2 space-y-1 text-gray-600 dark:text-gray-300">
                    {m.gender && (
                      <div>
                        <dt className="inline text-gray-500 dark:text-gray-400">Gender: </dt>
                        <dd className="inline">{m.gender}</dd>
                      </div>
                    )}
                    {!HIDE_RELATION_NAMES_IN_UI && m.relation ? (
                      <div>
                        <dt className="inline text-gray-500 dark:text-gray-400">Relation: </dt>
                        <dd className="inline">{m.relation}</dd>
                      </div>
                    ) : null}
                    {dob && (
                      <div>
                        <dt className="inline text-gray-500 dark:text-gray-400">Born: </dt>
                        <dd className="inline">{dob}</dd>
                      </div>
                    )}
                    {dod && (
                      <div>
                        <dt className="inline text-gray-500 dark:text-gray-400">Died: </dt>
                        <dd className="inline">{dod}</dd>
                      </div>
                    )}
                    {m.phone && (
                      <div>
                        <dt className="inline text-gray-500 dark:text-gray-400">Phone: </dt>
                        <dd className="inline">{m.phone}</dd>
                      </div>
                    )}
                    {m.email && (
                      <div>
                        <dt className="inline text-gray-500 dark:text-gray-400">Email: </dt>
                        <dd className="inline break-all">{m.email}</dd>
                      </div>
                    )}
                  </dl>
                  <Link
                    to={`/family-members/${m.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                  >
                    View profile
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 px-5 py-4 sm:flex-row sm:justify-end dark:border-gray-800">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onProceed}
            className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            Proceed with New Member
          </button>
        </div>
      </div>
    </div>
  );
}
