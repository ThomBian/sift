import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSpacesProjects } from '../../hooks/useSpacesProjects';

function SidebarLink({
  to,
  label,
  onNavigate,
}: {
  to: string;
  label: string;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={() => onNavigate?.()}
      className={({ isActive }) =>
        `flex items-center px-3 py-2.5 md:py-1.5 font-mono text-[11px] transition-colors duration-150 min-h-11 md:min-h-0 ${
          isActive
            ? 'text-text bg-accent/5'
            : 'text-muted hover:text-text hover:bg-surface-2'
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export default function Sidebar({ className = '', onNavigate }: SidebarProps) {
  const { spacesWithProjects } = useSpacesProjects();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggleSpace(spaceId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(spaceId)) next.delete(spaceId);
      else next.add(spaceId);
      return next;
    });
  }

  return (
    <aside
      className={`w-48 shrink-0 flex flex-col border-r border-[0.5px] border-border bg-surface overflow-y-auto min-h-0 ${className}`}
    >
      <div className="h-[2px] bg-accent shrink-0" />

      <div className="p-2 pt-3 space-y-0.5">
        <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-dim px-3 pb-1.5">Views</p>
        <SidebarLink to="/inbox" label="Inbox" onNavigate={onNavigate} />
        <SidebarLink to="/today" label="Today" onNavigate={onNavigate} />
        <SidebarLink to="/projects" label="Projects" onNavigate={onNavigate} />
      </div>

      <div className="h-[0.5px] min-h-[0.5px] bg-border mx-2 my-1" />

      <div className="p-2 space-y-1 flex-1">
        <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-dim px-2 pb-1">Spaces</p>
        {spacesWithProjects.map(({ space, projects }) => (
          <div key={space.id}>
            <button
              type="button"
              onClick={() => toggleSpace(space.id)}
              aria-expanded={!collapsed.has(space.id)}
              aria-controls={`space-projects-${space.id}`}
              className="w-full flex items-center gap-2 px-2 py-2.5 md:py-1 min-h-11 md:min-h-0 text-[11px] text-muted hover:text-text transition-colors font-mono"
            >
              <span
                className="w-1.5 h-1.5 shrink-0"
                style={{ backgroundColor: space.color }}
              />
              <span className="uppercase tracking-[0.1em] flex-1 text-left truncate">
                {space.name}
              </span>
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                className={`shrink-0 transition-transform ${
                  collapsed.has(space.id) ? '-rotate-90' : ''
                }`}
              >
                <path
                  d="M2 3.5L5 6.5L8 3.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <div
              id={`space-projects-${space.id}`}
              className={`ml-4 space-y-0.5 mt-0.5 ${collapsed.has(space.id) ? 'hidden' : ''}`}
            >
              {projects.map((project) => (
                <div key={project.id} className="flex items-center min-w-0">
                  <NavLink
                    to="/projects"
                    onClick={() => onNavigate?.()}
                    className="flex-1 flex items-center px-2 py-2.5 md:py-1 min-h-11 md:min-h-0 min-w-0 text-[11px] text-muted hover:text-text transition-colors truncate font-mono"
                  >
                    <span className="truncate">{project.name}</span>
                  </NavLink>
                  {project.url && (
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="shrink-0 px-1 text-dim hover:text-accent transition-colors"
                      aria-label={`Visit ${project.name} link`}
                    >
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path
                          d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7M7 1h4m0 0v4m0-4L5 7"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!user && (
        <div className="p-3 border-t border-[0.5px] border-border">
          <NavLink
            to="/auth"
            onClick={() => onNavigate?.()}
            className="flex items-center justify-center text-xs text-muted hover:text-accent transition-colors text-center py-3 md:py-0 min-h-11 md:min-h-0"
          >
            Sign in to sync across devices
          </NavLink>
        </div>
      )}
    </aside>
  );
}
