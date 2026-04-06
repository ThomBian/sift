import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Topbar from './Topbar';
import CommandPalette from '../CommandPalette';
import { useSpacesProjects } from '../../hooks/useSpacesProjects';
import type { Task, ChipFocus } from '@speedy/shared';

const VIEWS = ['/inbox', '/today', '/projects'];

function useDefaultProjectId(): string {
  const { spacesWithProjects } = useSpacesProjects();
  for (const { projects } of spacesWithProjects) {
    if (projects.length > 0) return projects[0].id;
  }
  return '';
}

interface AppLayoutProps {
  isSynced: boolean;
}

export default function AppLayout({ isSynced }: AppLayoutProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editChip, setEditChip] = useState<ChipFocus | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const defaultProjectId = useDefaultProjectId();

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

  useEffect(() => {
    function onEditTask(e: Event) {
      const { task, chip } = (e as CustomEvent<{ task: Task; chip: ChipFocus | null }>).detail;
      openPalette(task, chip);
    }
    window.addEventListener('sift:edit-task', onEditTask);
    return () => window.removeEventListener('sift:edit-task', onEditTask);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Cmd+K: open new task palette
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (paletteOpen) {
          closePalette();
        } else {
          openPalette();
        }
        return;
      }

      // Escape: close palette
      if (e.key === 'Escape' && paletteOpen) {
        e.preventDefault();
        closePalette();
        return;
      }

      // ArrowLeft / ArrowRight: switch views (when not typing and palette closed)
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA';
      if (!isInput && !paletteOpen && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
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
  }, [paletteOpen, navigate, location.pathname]);

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
    </div>
  );
}
