import { useState } from 'react';
import { db } from '../lib/db';
import type { Task } from '@speedy/shared';

export interface UseKeyboardNavReturn {
  focusedId: string | null;
  setFocusedId: (id: string | null) => void;
  handleKeyDown: (e: KeyboardEvent, tasks: Task[]) => void;
}

export function useKeyboardNav(
  onToggleDone?: (task: Task) => void
): UseKeyboardNavReturn {
  const [focusedId, setFocusedId] = useState<string | null>(null);

  function handleKeyDown(e: KeyboardEvent, tasks: Task[]) {
    if (!tasks.length) return;

    const currentIndex = tasks.findIndex((t) => t.id === focusedId);

    switch (e.key) {
      case 'j':
      case 'ArrowDown': {
        e.preventDefault();
        if (currentIndex === -1) {
          setFocusedId(tasks[0].id);
        } else if (currentIndex === tasks.length - 1) {
          setFocusedId(null);
        } else {
          setFocusedId(tasks[currentIndex + 1].id);
        }
        break;
      }

      case 'k':
      case 'ArrowUp': {
        e.preventDefault();
        if (currentIndex === -1) {
          setFocusedId(tasks[tasks.length - 1].id);
        } else if (currentIndex === 0) {
          setFocusedId(null);
        } else {
          setFocusedId(tasks[currentIndex - 1].id);
        }
        break;
      }

      case 'Escape': {
        setFocusedId(null);
        break;
      }

      case 'Enter': {
        if (focusedId === null) break;
        const task = currentIndex !== -1 ? tasks[currentIndex] : undefined;
        if (!task) break;

        if (onToggleDone) {
          onToggleDone(task);
        } else {
          const now = new Date();
          if (task.status === 'done') {
            void db.tasks.update(focusedId, {
              status: task.workingDate ? 'todo' : 'inbox',
              completedAt: null,
              updatedAt: now,
              synced: false,
            });
          } else {
            void db.tasks.update(focusedId, {
              status: 'done',
              completedAt: now,
              updatedAt: now,
              synced: false,
            });
          }
        }
        break;
      }

      case 'Backspace':
      case 'Delete': {
        if (focusedId === null) break;
        const now = new Date();
        void db.tasks.update(focusedId, {
          status: 'archived',
          updatedAt: now,
          synced: false,
        });
        if (currentIndex > 0) {
          setFocusedId(tasks[currentIndex - 1].id);
        } else if (tasks.length > 1) {
          setFocusedId(tasks[1].id);
        } else {
          setFocusedId(null);
        }
        break;
      }

      default:
        break;
    }
  }

  return { focusedId, setFocusedId, handleKeyDown };
}
