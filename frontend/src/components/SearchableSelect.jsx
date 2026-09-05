import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * A searchable dropdown select component that supports type-ahead filtering.
 * Designed for large option lists (100+ items) where native <select> is impractical.
 *
 * @param {{ value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; placeholder?: string; className?: string }} props
 */
export default function SearchableSelect({ value, onChange, options, placeholder = '— None —', className }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const selectedLabel = useMemo(() => {
    if (!value) return '';
    const match = options.find((o) => o.value === value);
    return match ? match.label : '';
  }, [value, options]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    setHighlightIdx(-1);
  }, [filtered]);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setQuery('');
    setHighlightIdx(-1);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        closeDropdown();
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, closeDropdown]);

  const handleSelect = useCallback(
    (val) => {
      onChange(val);
      closeDropdown();
    },
    [onChange, closeDropdown]
  );

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIdx((prev) => Math.min(prev + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIdx((prev) => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIdx >= 0 && highlightIdx < filtered.length) {
          handleSelect(filtered[highlightIdx].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeDropdown();
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (open && highlightIdx >= 0 && listRef.current) {
      const el = listRef.current.children[highlightIdx];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIdx, open]);

  const handleTriggerClick = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleTriggerClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex w-full touch-manipulation items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-left text-base sm:py-2 sm:text-sm',
          'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
          'dark:border-gray-600 dark:bg-gray-800 dark:text-white',
          open && 'border-primary-500 ring-2 ring-primary-500/20'
        )}
      >
        <span className={cn('truncate', !value && 'text-gray-400 dark:text-gray-500')}>
          {selectedLabel || placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {value && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', open && 'rotate-180')} />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-[min(50vh,16rem)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:max-h-none">
          {/* Search input */}
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 dark:border-gray-700">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type to search..."
              className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-white dark:placeholder:text-gray-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Options list */}
          <ul
            ref={listRef}
            role="listbox"
            className="max-h-52 overflow-y-auto overscroll-contain py-1"
          >
            {/* None option */}
            <li
              role="option"
              aria-selected={!value}
              onClick={() => handleSelect('')}
              className={cn(
                'cursor-pointer px-3 py-2 text-sm transition-colors',
                !value
                  ? 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-950/40 dark:text-primary-300'
                  : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700/50'
              )}
            >
              {placeholder}
            </li>

            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-center text-sm text-gray-400 dark:text-gray-500">
                No matches found
              </li>
            ) : (
              filtered.map((opt, idx) => (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={opt.value === value}
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    'cursor-pointer px-3 py-2 text-sm transition-colors',
                    opt.value === value && 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-950/40 dark:text-primary-300',
                    idx === highlightIdx && opt.value !== value && 'bg-gray-100 dark:bg-gray-700',
                    opt.value !== value && idx !== highlightIdx && 'text-gray-900 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/50'
                  )}
                >
                  {opt.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
