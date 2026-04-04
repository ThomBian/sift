import { useEffect } from 'react';
import { useProjectTasks } from '../hooks/useTasks';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import TaskRow from '../components/TaskRow';
import InputBar from '../components/InputBar';
import type { Task } from '@speedy/shared';

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted tabular-nums">
        {done}/{total}
      </span>
    </div>
  );
}

function useDefaultProjectId(): string {
  const groups = useProjectTasks();
  for (const { projects } of groups) {
    if (projects.length > 0) return projects[0].project.id;
  }
  return '';
}

export default function ProjectsView() {
  const groups = useProjectTasks();
  const { focusedId, setFocusedId, handleKeyDown } = useKeyboardNav();
  const defaultProjectId = useDefaultProjectId();

  const allTasks: Task[] = groups.flatMap(({ projects }) =>
    projects.flatMap(({ tasks }) =>
      tasks.filter((t) => t.status !== 'done' && t.status !== 'archived')
    )
  );

  useEffect(() => {
    if (allTasks.length > 0 && focusedId === null) {
      setFocusedId(allTasks[0].id);
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
      <div className="px-4 pt-6 pb-2">
        <h2 className="text-text text-sm font-medium">Projects</h2>
        <p className="text-muted text-xs mt-1">
          Progress per project — done counts toward the bar.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {groups.map(({ space, projects }) => (
          <div key={space.id} className="mb-6">
            <div className="flex items-center gap-2 px-4 py-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: space.color }}
              />
              <span className="text-xs text-muted font-medium uppercase tracking-wide">
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
                      <span className="text-sm text-text font-medium">
                        {project.name}
                      </span>
                    </div>
                    <ProgressBar done={done} total={total} />
                  </div>

                  {activeTasks.length === 0 ? (
                    <p className="text-muted text-xs px-4 py-3">All done!</p>
                  ) : (
                    activeTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        project={project}
                        space={space}
                        isFocused={focusedId === task.id}
                        onFocus={() => setFocusedId(task.id)}
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

      <InputBar defaultProjectId={defaultProjectId} />
    </div>
  );
}
