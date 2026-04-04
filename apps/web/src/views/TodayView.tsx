import { useEffect } from 'react';
import { useTodayTasks } from '../hooks/useTasks';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import { useSpacesProjects } from '../hooks/useSpacesProjects';
import TaskList from '../components/TaskList';
import InputBar from '../components/InputBar';

function useDefaultProjectId(): string {
  const { spacesWithProjects } = useSpacesProjects();
  for (const { projects } of spacesWithProjects) {
    if (projects.length > 0) return projects[0].id;
  }
  return '';
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function TodayView() {
  const tasks = useTodayTasks();
  const { focusedId, setFocusedId, handleKeyDown } = useKeyboardNav();
  const defaultProjectId = useDefaultProjectId();

  useEffect(() => {
    if (tasks.length > 0 && focusedId === null) {
      setFocusedId(tasks[0].id);
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
      <div className="px-4 pt-6 pb-2">
        <h2 className="text-text text-sm font-medium">Today</h2>
        <p className="text-muted text-xs mt-0.5">{todayLabel()}</p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <TaskList tasks={tasks} focusedId={focusedId} onFocus={setFocusedId} />
      </div>

      <InputBar defaultProjectId={defaultProjectId} />
    </div>
  );
}
