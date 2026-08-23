import { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchChatAttachmentBlob, revokeChatAttachmentBlob } from '../../lib/chatAttachmentLoader';

function LightboxSlide({ attachment }) {
  const [src, setSrc] = useState(attachment.localPreview || null);

  useEffect(() => {
    if (attachment.localPreview) {
      setSrc(attachment.localPreview);
      return undefined;
    }
    let active = true;
    fetchChatAttachmentBlob(attachment.id)
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch(() => {});
    return () => {
      active = false;
      if (!attachment.localPreview) revokeChatAttachmentBlob(attachment.id);
    };
  }, [attachment.id, attachment.localPreview]);

  if (!src) {
    return <div className="h-64 w-full max-w-lg animate-pulse rounded-lg bg-white/10" />;
  }

  return <img src={src} alt="" className="max-h-[85vh] max-w-full object-contain" />;
}

export default function ChatImageLightbox({ attachments, startIndex = 0, onClose }) {
  const items = attachments || [];
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    setIndex(startIndex);
  }, [startIndex]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(items.length - 1, i + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items.length, onClose]);

  if (!items.length) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
      {items.length > 1 ? (
        <>
          <button
            type="button"
            disabled={index <= 0}
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => Math.max(0, i - 1));
            }}
            className="absolute left-2 rounded-full bg-black/50 p-2 text-white disabled:opacity-30 sm:left-4"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            disabled={index >= items.length - 1}
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => Math.min(items.length - 1, i + 1));
            }}
            className="absolute right-2 rounded-full bg-black/50 p-2 text-white disabled:opacity-30 sm:right-14"
            aria-label="Next image"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      ) : null}
      <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-2">
        <LightboxSlide attachment={items[index]} />
        {items.length > 1 ? (
          <p className="text-sm text-white/80">
            {index + 1} / {items.length}
          </p>
        ) : null}
      </div>
    </div>
  );
}
