import { useEffect, useState, useCallback } from 'react';
import { useTodayTasks } from '../hooks/useTasks';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import TaskList from '../components/TaskList';
import { db } from '../lib/db';
import type { Task } from '@speedy/shared';

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function TodayView() {
  const tasks = useTodayTasks();
  const [exitingIds, setExitingIds] = useState(new Set<string>());

  const handleToggle = useCallback((task: Task) => {
    if (task.status === 'done') {
      void db.tasks.update(task.id, { status: 'todo', completedAt: null, updatedAt: new Date(), synced: false });
    } else {
      setExitingIds(prev => new Set([...prev, task.id]));
      setTimeout(() => {
        void db.tasks.update(task.id, { status: 'done', completedAt: new Date(), updatedAt: new Date(), synced: false });
        setExitingIds(prev => { const n = new Set(prev); n.delete(task.id); return n; });
      }, 320);
    }
  }, []);

  const { focusedId, setFocusedId, handleKeyDown } = useKeyboardNav(handleToggle);

  // When the focused task leaves the list, clear selection
  useEffect(() => {
    if (focusedId !== null && !tasks.find((t) => t.id === focusedId)) {
      setFocusedId(null);
    }
  }, [tasks, focusedId, setFocusedId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      handleKeyDown(e, tasks);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tasks, handleKeyDown]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-baseline gap-3 mb-1">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Today</h2>
          {tasks.length > 0 && (
            <span className="font-mono text-[10px] text-accent tabular-nums">{tasks.length}</span>
          )}
        </div>
        <p className="font-mono text-[11px] text-muted">{todayLabel()}</p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <TaskList tasks={tasks} focusedId={focusedId} onFocus={setFocusedId} onToggle={handleToggle} exitingIds={exitingIds} />
      </div>
    </div>
  );
}
