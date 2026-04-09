import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSpacesProjects } from '../../hooks/useSpacesProjects';

function SidebarLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `block px-3 py-1.5 font-mono text-[11px] transition-colors duration-150 border-l-2 ${
          isActive
            ? 'border-accent text-text bg-[#FF4F00]/5'
            : 'border-transparent text-muted hover:text-text hover:bg-surface-2'
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export default function Sidebar() {
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
    <aside className="w-48 shrink-0 flex flex-col border-r border-[0.5px] border-border bg-surface overflow-y-auto">
      <div className="h-[2px] bg-accent shrink-0" />

      <div className="p-2 pt-3 space-y-0.5">
        <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-dim px-3 pb-1.5">Views</p>
        <SidebarLink to="/inbox" label="Inbox" />
        <SidebarLink to="/today" label="Today" />
        <SidebarLink to="/projects" label="Projects" />
      </div>

      <div className="h-px bg-border mx-2 my-1" />

      <div className="p-2 space-y-1 flex-1">
        <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-dim px-2 pb-1">Spaces</p>
        {spacesWithProjects.map(({ space, projects }) => (
          <div key={space.id}>
            <button
              type="button"
              onClick={() => toggleSpace(space.id)}
              className="w-full flex items-center gap-2 px-2 py-1 text-[11px] text-muted hover:text-text transition-colors font-mono"
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

            {!collapsed.has(space.id) && (
              <div className="ml-4 space-y-0.5 mt-0.5">
                {projects.map((project) => (
                  <NavLink
                    key={project.id}
                    to="/projects"
                    className="block px-2 py-1 text-[11px] text-muted hover:text-text transition-colors truncate font-mono"
                  >
                    {project.name}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {!user && (
        <div className="p-3 border-t border-border">
          <NavLink
            to="/auth"
            className="block text-xs text-muted hover:text-accent transition-colors text-center"
          >
            Sign in to sync across devices
          </NavLink>
        </div>
      )}
    </aside>
  );
}
