import { useState } from 'react';
import { Camera, ImagePlus, Send, Smile } from 'lucide-react';
import ChatEmojiPicker from '../ChatEmojiPicker';
import { CHAT_MAX_IMAGES_PER_SEND } from '../../lib/chatMediaConstants';
import { captureChatImageFromCamera, pickChatImagesFromGallery } from '../../lib/chatMediaPicker';
import { prepareChatImages } from '../../lib/prepareChatImages';
import { cn } from '../../lib/utils';

export default function ChatComposer({
  draft,
  onDraftChange,
  pendingItems,
  onPendingChange,
  onSendText,
  onSendImages,
  sending,
  uploading,
  disabled,
}) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [localError, setLocalError] = useState('');

  const busy = sending || uploading || processing;
  const slotsLeft = CHAT_MAX_IMAGES_PER_SEND - (pendingItems?.length || 0);

  const addPreparedFiles = async (files) => {
    if (!files?.length) return;
    setLocalError('');
    setProcessing(true);
    try {
      const slice = files.slice(0, slotsLeft);
      const prepared = await prepareChatImages(slice);
      onPendingChange([...(pendingItems || []), ...prepared]);
    } catch (err) {
      setLocalError(err.message || 'Could not prepare images.');
    } finally {
      setProcessing(false);
    }
  };

  const handleGallery = async () => {
    if (slotsLeft <= 0) {
      setLocalError(`Maximum ${CHAT_MAX_IMAGES_PER_SEND} images per message.`);
      return;
    }
    try {
      const files = await pickChatImagesFromGallery(slotsLeft);
      await addPreparedFiles(files);
    } catch (err) {
      if (err?.message) setLocalError(err.message);
    }
  };

  const handleCamera = async () => {
    if (slotsLeft <= 0) {
      setLocalError(`Maximum ${CHAT_MAX_IMAGES_PER_SEND} images per message.`);
      return;
    }
    try {
      const files = await captureChatImageFromCamera();
      await addPreparedFiles(files);
    } catch (err) {
      if (err?.message) setLocalError(err.message);
    }
  };

  const removePending = (index) => {
    const next = [...(pendingItems || [])];
    const removed = next.splice(index, 1)[0];
    if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
    onPendingChange(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy || disabled) return;
    setLocalError('');

    if (pendingItems?.length) {
      const caption = draft.trim();
      onDraftChange('');
      setEmojiOpen(false);
      await onSendImages(pendingItems, caption);
      return;
    }

    const text = draft.trim();
    if (!text) return;
    setEmojiOpen(false);
    onSendText(text);
  };

  const insertEmoji = (emoji) => {
    onDraftChange(`${draft}${emoji}`);
  };

  const canSend = !busy && !disabled && (draft.trim() || pendingItems?.length);

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex shrink-0 flex-col gap-2 border-t border-gray-200 bg-white p-2 pb-safe dark:border-gray-700 dark:bg-gray-900 sm:p-3"
    >
      {pendingItems?.length ? (
        <div className="flex flex-wrap gap-2 px-1">
          {pendingItems.map((item, index) => {
            const preview =
              item.previewUrl ||
              (item.file ? URL.createObjectURL(item.file) : null);
            return (
              <div key={`${item.file?.name}-${index}`} className="relative h-16 w-16 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600">
                {preview ? (
                  <img src={preview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gray-100 dark:bg-gray-800" />
                )}
                <button
                  type="button"
                  onClick={() => removePending(index)}
                  className="absolute right-0 top-0 bg-black/60 px-1 text-xs text-white"
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      {localError ? <p className="px-1 text-xs text-red-600 dark:text-red-400">{localError}</p> : null}

      <div className="flex items-end gap-2">
        <div className="relative flex min-w-0 flex-1 items-end gap-1">
          <button
            type="button"
            onClick={() => setEmojiOpen((o) => !o)}
            disabled={busy}
            className={cn(
              'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors',
              emojiOpen
                ? 'border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
            )}
            aria-label="Open emoji picker"
          >
            <Smile className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleGallery}
            disabled={busy || slotsLeft <= 0}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
            aria-label="Attach images"
          >
            <ImagePlus className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleCamera}
            disabled={busy || slotsLeft <= 0}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
            aria-label="Take photo"
          >
            <Camera className="h-5 w-5" />
          </button>
          <ChatEmojiPicker
            open={emojiOpen}
            onClose={() => setEmojiOpen(false)}
            onSelect={insertEmoji}
            className="left-0"
          />
          <textarea
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            rows={1}
            placeholder={pendingItems?.length ? 'Add a caption…' : 'Type a message…'}
            maxLength={2000}
            disabled={busy}
            className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <button
          type="submit"
          disabled={!canSend}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      {processing ? (
        <p className="px-1 text-xs text-gray-500 dark:text-gray-400">Compressing images…</p>
      ) : null}
    </form>
  );
}
