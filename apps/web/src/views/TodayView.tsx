import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTodayTasks } from '../hooks/useTasks';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import { useSpacesProjects } from '../hooks/useSpacesProjects';
import TaskList from '../components/TaskList';
import TaskEditPalette, { type EditPatch } from '../components/TaskEditPalette';
import HintBar from '../components/layout/HintBar';
import { db } from '../lib/db';
import type { Task, ProjectWithSpace } from '@sift/shared';

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function dispatchEditTask(task: Task, chip: 'dueDate' | 'workingDate' | 'project' | null) {
  window.dispatchEvent(new CustomEvent('sift:edit-task', { detail: { task, chip } }));
}

export default function TodayView() {
  const tasks = useTodayTasks();
  const [exitingIds, setExitingIds] = useState(new Set<string>());
  const [urlEditTask, setUrlEditTask] = useState<Task | null>(null);
  const { spacesWithProjects } = useSpacesProjects();

  const allProjects = useMemo<ProjectWithSpace[]>(
    () => spacesWithProjects.flatMap(({ space, projects }) =>
      projects.map(p => ({ ...p, space }))
    ),
    [spacesWithProjects]
  );

  const handleToggle = useCallback((task: Task) => {
    if (task.status === 'done') {
      void db.tasks.update(task.id, { status: 'todo', completedAt: null, updatedAt: new Date(), synced: false });
    } else {
      setExitingIds((prev) => new Set([...prev, task.id]));
      setTimeout(() => {
        void db.tasks.update(task.id, { status: 'done', completedAt: new Date(), updatedAt: new Date(), synced: false });
        setExitingIds((prev) => { const n = new Set(prev); n.delete(task.id); return n; });
      }, 160);
    }
  }, []);

  const { focusedId, setFocusedId, handleKeyDown } = useKeyboardNav(handleToggle);

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
        if (e.key === 'u' || e.key === 'U') { e.preventDefault(); setUrlEditTask(focused); return; }
        if (e.metaKey && e.key === 'o') {
          e.preventDefault();
          if (focused.url) window.open(focused.url, '_blank', 'noopener,noreferrer');
          return;
        }
      }
      handleKeyDown(e, tasks);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tasks, handleKeyDown, focusedId]);

  async function handleUrlSave(patch: EditPatch) {
    if (!urlEditTask) return;
    await db.tasks.update(urlEditTask.id, { url: patch.url ?? null, updatedAt: new Date(), synced: false });
    setUrlEditTask(null);
  }

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
        <TaskList
          tasks={tasks}
          focusedId={focusedId}
          onFocus={setFocusedId}
          onToggle={handleToggle}
          exitingIds={exitingIds}
          emptyState={
            <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-16 text-center">
              <p className="font-mono text-[11px] text-muted uppercase tracking-[0.15em]">Nothing scheduled.</p>
              <p className="font-mono text-[10px] text-dim max-w-[260px] leading-relaxed">
                Go to Inbox, select a task, and press W to move it here.
              </p>
            </div>
          }
        />
      </div>

      {urlEditTask && (
        <TaskEditPalette
          task={urlEditTask}
          defaultField="url"
          projects={allProjects}
          onSave={handleUrlSave}
          onCancel={() => setUrlEditTask(null)}
        />
      )}
      <HintBar focusState={focusedId !== null ? 'task' : 'none'} />
    </div>
  );
}
