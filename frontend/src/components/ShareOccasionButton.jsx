import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { sharePlainText } from '../lib/sharePlainText';
import { cn } from '../lib/utils';

/**
 * System share sheet (WhatsApp, Messages, etc.) — no fixed recipient.
 */
export default function ShareOccasionButton({ title, text, compact = false, className }) {
  const [status, setStatus] = useState('');

  const onShare = async () => {
    setStatus('');
    const result = await sharePlainText(title, text);
    if (result === 'copied') setStatus('Message copied. Paste it in WhatsApp or Messages.');
  };

  return (
    <div className={cn('inline-flex flex-col items-stretch gap-1', className)}>
      <button
        type="button"
        onClick={onShare}
        className={cn(
          'inline-flex touch-manipulation items-center justify-center gap-1.5 rounded-lg font-medium transition-colors',
          compact
            ? 'border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
            : 'border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-800 hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-950/40 dark:text-primary-200 dark:hover:bg-primary-950/70'
        )}
      >
        <Share2 className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden />
        {compact ? 'Share' : 'Share event'}
      </button>
      {status ? <p className="text-xs text-gray-500 dark:text-gray-400">{status}</p> : null}
    </div>
  );
}
