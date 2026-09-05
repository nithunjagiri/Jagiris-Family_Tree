import { Check, CheckCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function ChatReadReceipt({ createdAt, peerLastReadAt, className }) {
  if (!createdAt) return null;
  const read =
    peerLastReadAt && new Date(peerLastReadAt).getTime() >= new Date(createdAt).getTime();
  const Icon = read ? CheckCheck : Check;
  return (
    <Icon
      className={cn('inline h-3 w-3 shrink-0', read ? 'text-sky-200' : 'text-primary-100/80', className)}
      aria-label={read ? 'Read' : 'Sent'}
    />
  );
}
