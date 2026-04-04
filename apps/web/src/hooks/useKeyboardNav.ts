import { useState } from 'react';
import { db } from '../lib/db';
import type { Task } from '@speedy/shared';

export interface UseKeyboardNavReturn {
  focusedId: string | null;
  setFocusedId: (id: string | null) => void;
  handleKeyDown: (e: KeyboardEvent, tasks: Task[]) => void;
}

export function useKeyboardNav(): UseKeyboardNavReturn {
  const [focusedId, setFocusedId] = useState<string | null>(null);

  function handleKeyDown(e: KeyboardEvent, tasks: Task[]) {
    if (!tasks.length) return;

    const currentIndex = tasks.findIndex((t) => t.id === focusedId);

    switch (e.key) {
      case 'j':
      case 'ArrowDown': {
        e.preventDefault();
        if (currentIndex < tasks.length - 1) {
          setFocusedId(tasks[currentIndex + 1].id);
        }
        break;
      }

      case 'k':
      case 'ArrowUp': {
        e.preventDefault();
        if (currentIndex > 0) {
          setFocusedId(tasks[currentIndex - 1].id);
        }
        break;
      }

      case 'Enter': {
        if (focusedId === null) break;
        const task = tasks.find((t) => t.id === focusedId);
        if (!task) break;

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
