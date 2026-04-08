import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Topbar from './Topbar';
import CommandPalette from '../CommandPalette';
import ProjectEditPalette from '../ProjectEditPalette';
import { useSpacesProjects } from '../../hooks/useSpacesProjects';
import type { Task, ChipFocus, Project } from '@sift/shared';

const VIEWS = ['/inbox', '/today', '/projects'];

interface ProjectPaletteState {
  spaceId?: string;
  project?: Project;
  initialField?: 'name' | 'emoji' | 'dueDate';
}

interface AppLayoutProps {
  isSynced: boolean;
}

export default function AppLayout({ isSynced }: AppLayoutProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editChip, setEditChip] = useState<ChipFocus | null>(null);

  const [projectPaletteOpen, setProjectPaletteOpen] = useState(false);
  const [projectPaletteState, setProjectPaletteState] = useState<ProjectPaletteState>({});
  const [focusedProjectId, setFocusedProjectId] = useState<string | null>(null);

  const { spacesWithProjects } = useSpacesProjects();
  const navigate = useNavigate();
  const location = useLocation();

  // Fallback default project id when no project is keyboard-focused
  const fallbackProjectId = spacesWithProjects.flatMap((s) => s.projects)[0]?.id ?? '';
  const defaultProjectId = focusedProjectId ?? fallbackProjectId;

  function openPalette(task?: Task | null, chip?: ChipFocus | null) {
    setEditTask(task ?? null);
    setEditChip(chip ?? null);
    setPaletteOpen(true);
  }

  function closePalette() {
    setPaletteOpen(false);
    setEditTask(null);
    setEditChip(null);
  }

  function closeProjectPalette() {
    setProjectPaletteOpen(false);
    setProjectPaletteState({});
  }

  useEffect(() => {
    function onEditTask(e: Event) {
      const { task, chip } = (e as CustomEvent<{ task: Task; chip: ChipFocus | null }>).detail;
      openPalette(task, chip);
    }
    function onNewProject(e: Event) {
      const { spaceId } = (e as CustomEvent<{ spaceId: string }>).detail;
      setProjectPaletteState({ spaceId });
      setProjectPaletteOpen(true);
    }
    function onEditProject(e: Event) {
      const { project, field } = (e as CustomEvent<{ project: Project; field: 'name' | 'emoji' | 'dueDate' }>).detail;
      setProjectPaletteState({ project, initialField: field });
      setProjectPaletteOpen(true);
    }
    function onProjectFocused(e: Event) {
      const { projectId } = (e as CustomEvent<{ projectId: string | null }>).detail;
      setFocusedProjectId(projectId);
    }

    window.addEventListener('sift:edit-task', onEditTask);
    window.addEventListener('sift:new-project', onNewProject);
    window.addEventListener('sift:edit-project', onEditProject);
    window.addEventListener('sift:project-focused', onProjectFocused);

    return () => {
      window.removeEventListener('sift:edit-task', onEditTask);
      window.removeEventListener('sift:new-project', onNewProject);
      window.removeEventListener('sift:edit-project', onEditProject);
      window.removeEventListener('sift:project-focused', onProjectFocused);
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (paletteOpen) {
          closePalette();
        } else {
          openPalette();
        }
        return;
      }

      if (e.key === 'Escape' && paletteOpen) {
        e.preventDefault();
        closePalette();
        return;
      }

      if (e.key === 'Escape' && projectPaletteOpen) {
        e.preventDefault();
        closeProjectPalette();
        return;
      }

      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA';
      if (!isInput && !paletteOpen && !projectPaletteOpen && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        const curr = VIEWS.findIndex((v) => location.pathname.startsWith(v));
        if (curr === -1) return;
        const next =
          e.key === 'ArrowRight'
            ? VIEWS[(curr + 1) % VIEWS.length]
            : VIEWS[(curr - 1 + VIEWS.length) % VIEWS.length];
        void navigate(next);
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paletteOpen, projectPaletteOpen, navigate, location.pathname]);

  return (
    <div className="flex flex-col h-full bg-bg">
      <Topbar isSynced={isSynced} />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
      <CommandPalette
        isOpen={paletteOpen}
        onClose={closePalette}
        defaultProjectId={defaultProjectId}
        editTask={editTask}
        editChip={editChip}
      />
      <ProjectEditPalette
        isOpen={projectPaletteOpen}
        onClose={closeProjectPalette}
        spaceId={projectPaletteState.spaceId}
        project={projectPaletteState.project}
        initialField={projectPaletteState.initialField}
      />
    </div>
  );
}
