import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * @param {{ label: string; to?: string }[]} items - Last item is the current page (no link).
 * @param {string} [backTo] - Explicit back destination; omit to use browser history.
 */
export default function Breadcrumb({ items, backTo, className }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
      return;
    }
    const idx = typeof window !== 'undefined' ? window.history.state?.idx : undefined;
    if (typeof idx === 'number' ? idx > 0 : window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3', className)}>
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex w-fit touch-manipulation items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 active:bg-primary-800 dark:bg-primary-600 dark:hover:bg-primary-500"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm sm:border-l sm:border-gray-200 sm:pl-3 dark:sm:border-gray-700"
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isHome = index === 0 && item.to === '/';

          return (
            <span key={`${item.label}-${index}`} className="inline-flex min-w-0 items-center gap-1.5">
              {index > 0 && <span className="text-gray-400 dark:text-gray-500">&gt;</span>}
              {isLast ? (
                <span className="truncate text-base font-bold text-primary-600 sm:text-lg dark:text-primary-400">
                  {item.label}
                </span>
              ) : item.to ? (
                <Link
                  to={item.to}
                  className="inline-flex min-w-0 items-center gap-1 truncate font-medium text-gray-600 transition-colors hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400"
                >
                  {isHome && <Home className="h-4 w-4 shrink-0" aria-hidden />}
                  <span className="truncate">{item.label}</span>
                </Link>
              ) : (
                <span className="truncate font-medium text-gray-600 dark:text-gray-300">{item.label}</span>
              )}
            </span>
          );
        })}
      </nav>
    </div>
  );
}
