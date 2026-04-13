import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";
import CommandPalette from "../CommandPalette";
import ProjectEditPalette from "../ProjectEditPalette";
import type { SyncStatus } from "../../hooks/useSync";
import type { Task, ChipFocus, Project } from "@sift/shared";

const VIEWS = ["/inbox", "/today", "/projects"];

interface ProjectPaletteState {
  spaceId?: string;
  project?: Project;
  initialField?: "name" | "emoji" | "dueDate" | "url";
}

interface AppLayoutProps {
  syncStatus: SyncStatus;
}

export default function AppLayout({ syncStatus }: AppLayoutProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editChip, setEditChip] = useState<ChipFocus | null>(null);

  const [projectPaletteOpen, setProjectPaletteOpen] = useState(false);
  const [projectPaletteState, setProjectPaletteState] =
    useState<ProjectPaletteState>({});
  const [focusedProjectId, setFocusedProjectId] = useState<string | null>(null);
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

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
      const { task, chip } = (
        e as CustomEvent<{ task: Task; chip: ChipFocus | null }>
      ).detail;
      openPalette(task, chip);
    }
    function onNewProject(e: Event) {
      const { spaceId } = (e as CustomEvent<{ spaceId: string }>).detail;
      setProjectPaletteState({ spaceId });
      setProjectPaletteOpen(true);
    }
    function onEditProject(e: Event) {
      const { project, field } = (
        e as CustomEvent<{
          project: Project;
          field: "name" | "emoji" | "dueDate" | "url";
        }>
      ).detail;
      setProjectPaletteState({ project, initialField: field });
      setProjectPaletteOpen(true);
    }
    function onProjectFocused(e: Event) {
      const { projectId } = (e as CustomEvent<{ projectId: string | null }>)
        .detail;
      setFocusedProjectId(projectId);
    }

    window.addEventListener("sift:edit-task", onEditTask);
    window.addEventListener("sift:new-project", onNewProject);
    window.addEventListener("sift:edit-project", onEditProject);
    window.addEventListener("sift:project-focused", onProjectFocused);

    return () => {
      window.removeEventListener("sift:edit-task", onEditTask);
      window.removeEventListener("sift:new-project", onNewProject);
      window.removeEventListener("sift:edit-project", onEditProject);
      window.removeEventListener("sift:project-focused", onProjectFocused);
    };
  }, []);

  useEffect(() => {
    setNavDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!navDrawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navDrawerOpen]);

  useEffect(() => {
    if (!navDrawerOpen) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setNavDrawerOpen(false);
    }
    window.addEventListener("keydown", onEsc, true);
    return () => window.removeEventListener("keydown", onEsc, true);
  }, [navDrawerOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (paletteOpen) {
          closePalette();
        } else {
          openPalette();
        }
        return;
      }

      if (e.key === "Escape" && paletteOpen) {
        e.preventDefault();
        closePalette();
        return;
      }

      if (e.key === "Escape" && projectPaletteOpen) {
        e.preventDefault();
        closeProjectPalette();
        return;
      }

      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA";
      if (
        !isInput &&
        !paletteOpen &&
        !projectPaletteOpen &&
        (e.key === "ArrowLeft" || e.key === "ArrowRight")
      ) {
        e.preventDefault();
        const curr = VIEWS.findIndex((v) => location.pathname.startsWith(v));
        if (curr === -1) return;
        const next =
          e.key === "ArrowRight"
            ? VIEWS[(curr + 1) % VIEWS.length]
            : VIEWS[(curr - 1 + VIEWS.length) % VIEWS.length];
        void navigate(next);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, projectPaletteOpen, navigate, location.pathname]);

  return (
    <div className="flex flex-col h-full bg-bg min-h-0">
      <Topbar
        syncStatus={syncStatus}
        onMenuClick={() => setNavDrawerOpen((o) => !o)}
        menuOpen={navDrawerOpen}
      />

      <div
        className={`fixed inset-x-0 top-12 bottom-0 z-40 bg-text/30 backdrop-blur-scrim transition-opacity duration-150 md:hidden ${
          navDrawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setNavDrawerOpen(false)}
        aria-hidden
      />

      <div
        id="mobile-spaces-nav"
        className={`fixed left-0 top-12 bottom-0 z-40 w-[min(18rem,calc(100vw-1rem))] border-r border-[0.5px] border-border bg-surface shadow-panel transition-transform duration-150 ease-spring md:hidden overflow-hidden flex flex-col ${
          navDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          onNavigate={() => setNavDrawerOpen(false)}
          className="w-full flex-1 min-h-0 border-r-0 shadow-none"
        />
      </div>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
        <div className="flex-1 overflow-y-auto min-h-0">
          <Outlet />
        </div>
      </main>
      <CommandPalette
        isOpen={paletteOpen}
        onClose={closePalette}
        prefillProjectId={focusedProjectId}
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
