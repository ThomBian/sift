import { useState, useEffect, useRef, useMemo } from 'react';
import { EMOJI_POOL, searchEmojis } from '../emojiPool';
import styles from './EmojiPicker.module.css';

interface EmojiPickerProps {
  query: string;
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ query, onSelect }: EmojiPickerProps) {
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const { sections, flatEmojis } = useMemo(() => {
    if (query.trim()) {
      const matched = searchEmojis(query);
      return {
        sections: matched.length > 0 ? [{ category: 'Results', emojis: matched }] : [],
        flatEmojis: matched,
      };
    }
    const flat: string[] = [];
    for (const cat of EMOJI_POOL) {
      flat.push(...cat.emojis);
    }
    return { sections: EMOJI_POOL, flatEmojis: flat };
  }, [query]);

  useEffect(() => {
    setFocusedIndex(-1);
  }, [query]);

  const flatEmojisRef = useRef(flatEmojis);
  useEffect(() => { flatEmojisRef.current = flatEmojis; }, [flatEmojis]);
  const focusedIndexRef = useRef(focusedIndex);
  useEffect(() => { focusedIndexRef.current = focusedIndex; }, [focusedIndex]);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  // Capture-phase keyboard listener (same pattern as Dropdown in SmartInput)
  useEffect(() => {
    const COLS = 8;
    function onKey(e: KeyboardEvent) {
      const len = flatEmojisRef.current.length;
      if (len === 0) return;

      if (e.key === 'ArrowRight') {
        e.stopImmediatePropagation();
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, len - 1));
      } else if (e.key === 'ArrowLeft') {
        e.stopImmediatePropagation();
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'ArrowDown') {
        e.stopImmediatePropagation();
        e.preventDefault();
        setFocusedIndex((i) => {
          if (i < 0) return 0;
          const next = i + COLS;
          return next < len ? next : i;
        });
      } else if (e.key === 'ArrowUp') {
        e.stopImmediatePropagation();
        e.preventDefault();
        setFocusedIndex((i) => {
          const next = i - COLS;
          return next >= 0 ? next : i;
        });
      } else if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
        e.stopImmediatePropagation();
        e.preventDefault();
        const idx = focusedIndexRef.current >= 0 ? focusedIndexRef.current : 0;
        const emoji = flatEmojisRef.current[idx];
        if (emoji) onSelectRef.current(emoji);
      }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  if (flatEmojis.length === 0) {
    return (
      <div className={styles.picker}>
        <div className={styles.empty}>No emojis found</div>
      </div>
    );
  }

  let globalIndex = 0;

  return (
    <div className={styles.picker}>
      {sections.map((section) => (
        <div key={section.category}>
          <div className={styles.categoryHeader}>{section.category}</div>
          <div className={styles.grid}>
            {section.emojis.map((emoji) => {
              const idx = globalIndex++;
              return (
                <button
                  key={`${section.category}-${emoji}`}
                  type="button"
                  className={`${styles.cell} ${idx === focusedIndex ? styles.cellFocused : ''}`}
                  onClick={() => onSelect(emoji)}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
