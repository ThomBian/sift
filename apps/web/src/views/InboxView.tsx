import { useEffect, useState, useCallback } from 'react';
import { useInboxTasks } from '../hooks/useTasks';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import TaskList from '../components/TaskList';
import HintBar from '../components/layout/HintBar';
import { db } from '../lib/db';
import type { Task } from '@sift/shared';

function dispatchEditTask(task: Task, chip: 'dueDate' | 'workingDate' | 'project' | null) {
  window.dispatchEvent(new CustomEvent('sift:edit-task', { detail: { task, chip } }));
}

export default function InboxView() {
  const tasks = useInboxTasks();
  const [exitingIds, setExitingIds] = useState(new Set<string>());

  const handleToggle = useCallback((task: Task) => {
    if (task.status === 'done') {
      void db.tasks.update(task.id, { status: 'inbox', completedAt: null, updatedAt: new Date(), synced: false });
    } else {
      setExitingIds((prev) => new Set([...prev, task.id]));
      setTimeout(() => {
        void db.tasks.update(task.id, { status: 'done', completedAt: new Date(), updatedAt: new Date(), synced: false });
        setExitingIds((prev) => { const n = new Set(prev); n.delete(task.id); return n; });
      }, 320);
    }
  }, []);

  const { focusedId, setFocusedId, handleKeyDown } = useKeyboardNav(handleToggle);

  // Clear focus when focused task leaves the list
  useEffect(() => {
    if (focusedId !== null && !tasks.find((t) => t.id === focusedId)) {
      setFocusedId(null);
    }
  }, [tasks, focusedId, setFocusedId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const focused = focusedId !== null ? tasks.find((t) => t.id === focusedId) ?? null : null;
      if (focused) {
        if (e.key === 'd' || e.key === 'D') { e.preventDefault(); dispatchEditTask(focused, 'dueDate'); return; }
        if (e.key === 'w' || e.key === 'W') { e.preventDefault(); dispatchEditTask(focused, 'workingDate'); return; }
        if (e.key === 'p' || e.key === 'P') { e.preventDefault(); dispatchEditTask(focused, 'project'); return; }
        if (e.key === 'e' || e.key === 'E') { e.preventDefault(); dispatchEditTask(focused, null); return; }
      }
      handleKeyDown(e, tasks);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tasks, handleKeyDown, focusedId]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-baseline gap-3 mb-1">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Inbox</h2>
          {tasks.length > 0 && (
            <span className="font-mono text-[10px] text-accent tabular-nums">{tasks.length}</span>
          )}
        </div>
        <p className="text-muted text-[11px]">
          Triage — assign a date or project, then move to Today.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <TaskList
          tasks={tasks}
          focusedId={focusedId}
          onFocus={setFocusedId}
          onToggle={handleToggle}
          exitingIds={exitingIds}
        />
      </div>

      <HintBar taskFocused={focusedId !== null} />
    </div>
  );
}
