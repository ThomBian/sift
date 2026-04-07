import { useEffect, useCallback, useState, useMemo } from 'react';
import { useProjectTasks } from '../hooks/useTasks';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import { useProjectNav } from '../hooks/useProjectNav';
import TaskRow from '../components/TaskRow';
import HintBar from '../components/layout/HintBar';
import { db } from '../lib/db';
import type { Task, Project } from '@sift/shared';

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-border overflow-hidden">
        <div className="h-full bg-accent transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted font-mono tabular-nums">{done}/{total}</span>
    </div>
  );
}

function dispatchEditTask(task: Task, chip: 'dueDate' | 'workingDate' | 'project' | null) {
  window.dispatchEvent(new CustomEvent('sift:edit-task', { detail: { task, chip } }));
}

export default function ProjectsView() {
  const groups = useProjectTasks();
  const [exitingIds, setExitingIds] = useState(new Set<string>());
  const [navMode, setNavMode] = useState<'project' | 'task'>('project');
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  const { focusedProjectId, setFocusedProjectId, handleProjectKeyDown } = useProjectNav();
  const handleToggle = useCallback((task: Task) => {
    if (task.status === 'done') {
      const now = new Date();
      void db.tasks.update(task.id, { status: task.workingDate ? 'todo' : 'inbox', completedAt: null, updatedAt: now, synced: false });
    } else {
      setExitingIds((prev) => new Set([...prev, task.id]));
      setTimeout(() => {
        const now = new Date();
        void db.tasks.update(task.id, { status: 'done', completedAt: now, updatedAt: now, synced: false });
        setExitingIds((prev) => { const n = new Set(prev); n.delete(task.id); return n; });
      }, 320);
    }
  }, []);
  const { focusedId, setFocusedId, handleKeyDown } = useKeyboardNav(handleToggle);

  // Flat list of all projects for project-level nav
  const allProjects = useMemo<Project[]>(
    () => groups.flatMap(({ projects: ps }) => ps.map(({ project }) => project)),
    [groups]
  );

  // Tasks for the currently expanded project (all non-archived)
  const expandedTasks = useMemo<Task[]>(() => {
    if (!expandedProjectId) return [];
    for (const { projects: ps } of groups) {
      for (const { project, tasks } of ps) {
        if (project.id === expandedProjectId) {
          return tasks.filter((t) => t.status !== 'archived');
        }
      }
    }
    return [];
  }, [groups, expandedProjectId]);

  // Clear focused task when it leaves the expanded project's task list
  useEffect(() => {
    if (focusedId !== null && !expandedTasks.find((t) => t.id === focusedId)) {
      setFocusedId(null);
    }
  }, [expandedTasks, focusedId, setFocusedId]);

  // Broadcast focused project to AppLayout for Cmd+K prefill
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('sift:project-focused', { detail: { projectId: focusedProjectId } })
    );
  }, [focusedProjectId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (navMode === 'task') {
        // Esc exits task mode and collapses the task list
        if (e.key === 'Escape') {
          e.preventDefault();
          setNavMode('project');
          setFocusedId(null);
          setExpandedProjectId(null);
          return;
        }
        // D/W/P/E on focused task
        const focused = focusedId !== null ? expandedTasks.find((t) => t.id === focusedId) ?? null : null;
        if (focused) {
          if (e.key === 'd' || e.key === 'D') { e.preventDefault(); dispatchEditTask(focused, 'dueDate'); return; }
          if (e.key === 'w' || e.key === 'W') { e.preventDefault(); dispatchEditTask(focused, 'workingDate'); return; }
          if (e.key === 'p' || e.key === 'P') { e.preventDefault(); dispatchEditTask(focused, 'project'); return; }
          if (e.key === 'e' || e.key === 'E') { e.preventDefault(); dispatchEditTask(focused, null); return; }
        }
        handleKeyDown(e, expandedTasks);
      } else {
        // Project nav mode
        if (focusedProjectId !== null) {
          const focusedProject = allProjects.find((p) => p.id === focusedProjectId);
          if (focusedProject) {
            if (e.key === 'n' || e.key === 'N') {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('sift:new-project', { detail: { spaceId: focusedProject.spaceId } }));
              return;
            }
            if (e.key === 'e' || e.key === 'E') {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('sift:edit-project', { detail: { project: focusedProject, field: 'name' } }));
              return;
            }
            if (e.key === 'd' || e.key === 'D') {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('sift:edit-project', { detail: { project: focusedProject, field: 'dueDate' } }));
              return;
            }
            if (e.key === 'o' || e.key === 'O') {
              e.preventDefault();
              if (expandedProjectId === focusedProjectId) {
                setExpandedProjectId(null);
                setNavMode('project');
              } else {
                setExpandedProjectId(focusedProjectId);
                setNavMode('task');
              }
              return;
            }
          }
        }
        // N with no project focused → new project in first available space
        if (e.key === 'n' || e.key === 'N') {
          const firstSpaceId = allProjects[0]?.spaceId ?? groups[0]?.space.id;
          if (firstSpaceId) {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('sift:new-project', { detail: { spaceId: firstSpaceId } }));
          }
          return;
        }
        handleProjectKeyDown(e, allProjects);
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navMode, focusedProjectId, focusedId, expandedProjectId, allProjects, expandedTasks, handleKeyDown, handleProjectKeyDown, groups]);

  const focusState = navMode === 'task' && focusedId !== null ? 'task' : 'project';

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-4 pb-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-1">Projects</h2>
        <p className="text-muted text-[11px]">Progress per project.</p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {groups.map(({ space, projects: ps }) => (
          <div key={space.id} className="mb-6">
            <div className="flex items-center gap-2 px-4 py-2 mt-2">
              <span className="w-1.5 h-1.5 shrink-0" style={{ backgroundColor: space.color }} />
              <span className="text-[9px] text-muted font-mono uppercase tracking-[0.2em]">{space.name}</span>
            </div>

            {ps.map(({ project, tasks }) => {
              const done = tasks.filter((t) => t.status === 'done').length;
              const activeTasks = tasks.filter((t) => t.status !== 'archived');
              const isFocusedProject = focusedProjectId === project.id;
              const isExpanded = expandedProjectId === project.id;

              return (
                <div
                  key={project.id}
                  className={`mb-4 border-l-2 transition-colors duration-150 ${
                    isFocusedProject ? 'border-accent' : 'border-transparent'
                  }`}
                  style={isFocusedProject ? { boxShadow: '-2px 0 8px rgba(255, 79, 0, 0.2)' } : undefined}
                  onClick={() => setFocusedProjectId(project.id)}
                >
                  <div className="px-4 py-2 border-b border-border">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`font-mono text-[11px] ${isFocusedProject ? 'text-accent' : 'text-text'}`}>
                        {project.name}
                      </span>
                      {project.dueDate && (
                        <span className="font-mono text-[10px] text-muted">
                          {project.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <ProgressBar done={done} total={tasks.length} />
                  </div>

                  {isExpanded && (
                    activeTasks.length === 0 ? (
                      <p className="font-mono text-[10px] text-muted px-4 py-3 uppercase tracking-[0.1em]">No tasks.</p>
                    ) : (
                      activeTasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          project={project}
                          space={space}
                          isFocused={navMode === 'task' && focusedId === task.id}
                          onFocus={() => { setNavMode('task'); setFocusedId(task.id); }}
                          onToggle={() => handleToggle(task)}
                          exiting={exitingIds.has(task.id)}
                        />
                      ))
                    )
                  )}
                </div>
              );
            })}
          </div>
        ))}
        {groups.length === 0 && (
          <p className="text-muted text-sm px-4 py-8 text-center">
            No projects yet. Press N to create one.
          </p>
        )}
      </div>

      <HintBar focusState={focusState as 'none' | 'project' | 'task'} />
    </div>
  );
}
