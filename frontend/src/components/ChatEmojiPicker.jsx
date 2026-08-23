import { useEffect, useRef } from 'react';
import { cn } from '../lib/utils';

const EMOJI_GROUPS = [
  {
    label: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😊', '🙂', '😉', '😍', '🥰', '😘', '😋', '😎', '🤗', '🤩', '😇', '🥳'],
  },
  {
    label: 'Gestures',
    emojis: ['👍', '👎', '👏', '🙌', '🤝', '🙏', '💪', '✌️', '🤞', '👋', '🤙', '👌', '🫶', '❤️', '💙', '💚'],
  },
  {
    label: 'Family',
    emojis: ['👨‍👩‍👧‍👦', '👪', '🏠', '🎉', '🎂', '🎁', '🌸', '🌺', '🪔', '🙏', '✨', '🌟', '☀️', '🌙', '🔥', '💯'],
  },
];

export default function ChatEmojiPicker({ open, onClose, onSelect, className }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointer = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose?.();
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className={cn(
        'absolute bottom-full left-0 z-20 mb-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800',
        className
      )}
      role="dialog"
      aria-label="Emoji picker"
    >
      <div className="max-h-48 space-y-3 overflow-y-auto">
        {EMOJI_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">{group.label}</p>
            <div className="flex flex-wrap gap-1">
              {group.emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onSelect?.(emoji);
                    onClose?.();
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label={`Insert ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
