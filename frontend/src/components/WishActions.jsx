import { MessageCircle, Phone } from 'lucide-react';
import { memberContactNumbers, smsHref, whatsAppHref } from '../lib/phoneLinks';
import { cn } from '../lib/utils';

const linkClass =
  'inline-flex touch-manipulation items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors';

/**
 * Opens WhatsApp / SMS with a prefilled message. Does not send automatically.
 * @param {{ member: object; message: string; compact?: boolean; className?: string }} props
 */
export default function WishActions({ member, message, compact = false, className }) {
  const { whatsapp, sms } = memberContactNumbers(member);
  const waLink = whatsAppHref(whatsapp, message);
  const smsLink = smsHref(sms, message);

  if (!waLink && !smsLink) {
    if (compact) return null;
    return (
      <p className={cn('text-xs text-gray-500 dark:text-gray-400', className)}>
        Add a WhatsApp or phone number on this profile to send a wish.
      </p>
    );
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {waLink ? (
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            linkClass,
            compact ? 'px-2.5 py-1 text-xs' : '',
            'bg-emerald-600 text-white hover:bg-emerald-700'
          )}
        >
          <MessageCircle className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden />
          {compact ? 'WhatsApp' : 'Wish on WhatsApp'}
        </a>
      ) : null}
      {smsLink ? (
        <a
          href={smsLink}
          className={cn(
            linkClass,
            compact ? 'px-2.5 py-1 text-xs' : '',
            'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
          )}
        >
          <Phone className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden />
          {compact ? 'SMS' : 'Send SMS'}
        </a>
      ) : null}
    </div>
  );
}
