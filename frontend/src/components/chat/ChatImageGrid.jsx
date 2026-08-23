import { useEffect, useState } from 'react';
import { fetchChatAttachmentBlob, revokeChatAttachmentBlob } from '../../lib/chatAttachmentLoader';
import { cn } from '../../lib/utils';

function ChatAttachmentImage({ attachment, onClick, className }) {
  const [src, setSrc] = useState(attachment.localPreview || null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (attachment.localPreview) {
      setSrc(attachment.localPreview);
      return undefined;
    }
    let active = true;
    setFailed(false);
    fetchChatAttachmentBlob(attachment.id)
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      if (!attachment.localPreview) revokeChatAttachmentBlob(attachment.id);
    };
  }, [attachment.id, attachment.localPreview]);

  if (failed) {
    return (
      <div className={cn('flex items-center justify-center bg-black/10 text-xs text-gray-500', className)}>
        Unavailable
      </div>
    );
  }

  if (!src) {
    return <div className={cn('animate-pulse bg-black/10', className)} />;
  }

  return (
    <button type="button" onClick={onClick} className={cn('block overflow-hidden', className)}>
      <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
    </button>
  );
}

export default function ChatImageGrid({ attachments, onImageClick }) {
  const items = (attachments || []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const count = items.length;
  if (count === 0) return null;

  if (count === 1) {
    return (
      <ChatAttachmentImage
        attachment={items[0]}
        onClick={() => onImageClick?.(0)}
        className="max-h-64 w-full min-w-[12rem] rounded-lg"
      />
    );
  }

  const gridClass =
    count === 2
      ? 'grid-cols-2'
      : count === 3
        ? 'grid-cols-2'
        : count === 4
          ? 'grid-cols-2'
          : 'grid-cols-2';

  return (
    <div className={cn('grid gap-1', gridClass)}>
      {items.map((att, index) => (
        <ChatAttachmentImage
          key={att.id || index}
          attachment={att}
          onClick={() => onImageClick?.(index)}
          className={cn(
            'aspect-square min-h-[5rem] rounded-md',
            count === 3 && index === 0 && 'col-span-2 aspect-[2/1]'
          )}
        />
      ))}
    </div>
  );
}
