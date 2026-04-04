import { useEffect } from 'react';
import { useInboxTasks } from '../hooks/useTasks';
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

export default function InboxView() {
  const tasks = useInboxTasks();
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
        <h2 className="text-text text-sm font-medium">Inbox</h2>
        <p className="text-muted text-xs mt-1 max-w-prose">
          Triage here — assign a working date or project, then move work to Today.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <TaskList tasks={tasks} focusedId={focusedId} onFocus={setFocusedId} />
      </div>

      <InputBar defaultProjectId={defaultProjectId} />
    </div>
  );
}
