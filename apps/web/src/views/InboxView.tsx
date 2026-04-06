import { useEffect, useState, useCallback, useMemo } from 'react';
import { useInboxTasks } from '../hooks/useTasks';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import { useSpacesProjects } from '../hooks/useSpacesProjects';
import TaskList from '../components/TaskList';
import HintBar from '../components/layout/HintBar';
import TaskEditPalette, { type EditField, type EditPatch } from '../components/TaskEditPalette';
import { db } from '../lib/db';
import type { Task, ProjectWithSpace } from '@speedy/shared';

export default function InboxView() {
  const tasks = useInboxTasks();
  const [exitingIds, setExitingIds] = useState(new Set<string>());
  const [editField, setEditField] = useState<EditField | null>(null);

  const { spacesWithProjects } = useSpacesProjects();
  const projects = useMemo<ProjectWithSpace[]>(
    () => spacesWithProjects.flatMap(({ space, projects: ps }) => ps.map((p) => ({ ...p, space }))),
    [spacesWithProjects]
  );

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

  const focusedTask = tasks.find((t) => t.id === focusedId) ?? null;

  const handleEditSave = useCallback(
    (patch: EditPatch) => {
      if (!focusedId) return;
      void db.tasks.update(focusedId, {
        ...patch,
        updatedAt: new Date(),
        synced: false,
        ...(patch.workingDate !== undefined
          ? { status: patch.workingDate !== null ? 'todo' : 'inbox' }
          : {}),
      });
      setEditField(null);
    },
    [focusedId]
  );

  // Clear selection and palette when focused task leaves the list
  useEffect(() => {
    if (focusedId !== null && !tasks.find((t) => t.id === focusedId)) {
      setFocusedId(null);
      setEditField(null);
    }
  }, [tasks, focusedId, setFocusedId]);

  // Clear palette when task is deselected
  useEffect(() => {
    if (focusedId === null) setEditField(null);
  }, [focusedId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (focusedId !== null && editField === null) {
        if (e.key === 'd' || e.key === 'D') { e.preventDefault(); setEditField('dueDate'); return; }
        if (e.key === 'w' || e.key === 'W') { e.preventDefault(); setEditField('workingDate'); return; }
        if (e.key === 'p' || e.key === 'P') { e.preventDefault(); setEditField('project'); return; }
        if (e.key === 'e' || e.key === 'E') { e.preventDefault(); setEditField('title'); return; }
      }
      handleKeyDown(e, tasks);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tasks, handleKeyDown, focusedId, editField]);

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

      {editField !== null && focusedTask !== null ? (
        <TaskEditPalette
          task={focusedTask}
          defaultField={editField}
          projects={projects}
          onSave={handleEditSave}
          onCancel={() => setEditField(null)}
        />
      ) : (
        <HintBar taskFocused={focusedId !== null} />
      )}
    </div>
  );
}
