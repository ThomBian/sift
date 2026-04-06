import { useEffect, useCallback, useState } from 'react';
import { useProjectTasks } from '../hooks/useTasks';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import TaskRow from '../components/TaskRow';
import { db } from '../lib/db';
import type { Task } from '@speedy/shared';

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-border overflow-hidden">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted font-mono tabular-nums">
        {done}/{total}
      </span>
    </div>
  );
}

export default function ProjectsView() {
  const groups = useProjectTasks();
  const [exitingIds, setExitingIds] = useState(new Set<string>());

  const handleToggle = useCallback((task: Task) => {
    const now = new Date();
    if (task.status === 'done') {
      void db.tasks.update(task.id, { status: task.workingDate ? 'todo' : 'inbox', completedAt: null, updatedAt: now, synced: false });
    } else {
      setExitingIds(prev => new Set([...prev, task.id]));
      setTimeout(() => {
        void db.tasks.update(task.id, { status: 'done', completedAt: now, updatedAt: now, synced: false });
        setExitingIds(prev => { const n = new Set(prev); n.delete(task.id); return n; });
      }, 320);
    }
  }, []);

  const { focusedId, setFocusedId, handleKeyDown } = useKeyboardNav(handleToggle);

  const allTasks: Task[] = groups.flatMap(({ projects }) =>
    projects.flatMap(({ tasks }) =>
      tasks.filter((t) => t.status !== 'done' && t.status !== 'archived')
    )
  );

  // When the focused task leaves the list, clear selection
  useEffect(() => {
    if (focusedId !== null && !allTasks.find((t) => t.id === focusedId)) {
      setFocusedId(null);
    }
  }, [allTasks, focusedId, setFocusedId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      handleKeyDown(e, allTasks);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [allTasks, handleKeyDown]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-4 pb-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-1">Projects</h2>
        <p className="text-muted text-[11px]">Progress per project.</p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {groups.map(({ space, projects }) => (
          <div key={space.id} className="mb-6">
            <div className="flex items-center gap-2 px-4 py-2 mt-2">
              <span
                className="w-1.5 h-1.5 shrink-0"
                style={{ backgroundColor: space.color }}
              />
              <span className="text-[9px] text-muted font-mono uppercase tracking-[0.2em]">
                {space.name}
              </span>
            </div>

            {projects.map(({ project, tasks }) => {
              const done = tasks.filter((t) => t.status === 'done').length;
              const total = tasks.length;
              const activeTasks = tasks.filter(
                (t) => t.status !== 'done' && t.status !== 'archived'
              );

              return (
                <div key={project.id} className="mb-4">
                  <div className="px-4 py-2 border-b border-border">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-[11px] text-text">
                        {project.name}
                      </span>
                    </div>
                    <ProgressBar done={done} total={total} />
                  </div>

                  {activeTasks.length === 0 ? (
                    <p className="font-mono text-[10px] text-dim px-4 py-3 uppercase tracking-[0.1em]">All done.</p>
                  ) : (
                    activeTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        project={project}
                        space={space}
                        isFocused={focusedId === task.id}
                        onFocus={() => setFocusedId(task.id)}
                        onToggle={() => handleToggle(task)}
                        exiting={exitingIds.has(task.id)}
                      />
                    ))
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {groups.length === 0 && (
          <p className="text-muted text-sm px-4 py-8 text-center">
            No projects yet. Create a task and assign it to a project.
          </p>
        )}
      </div>
    </div>
  );
}
