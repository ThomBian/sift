import { NavLink } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTasks } from "../../hooks/useTasks";

function SyncBadge({ isSynced }: { isSynced: boolean }) {
  const label = isSynced ? "Synced" : "Local";
  return (
    <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
      <span
        className={`w-1.5 h-1.5 shrink-0 ${isSynced ? "bg-green" : "bg-dim animate-pulse"}`}
        aria-hidden
      />
      <span className="hidden sm:inline">{label}</span>
      <span className="sr-only">{label}</span>
    </div>
  );
}

function NavTab({
  to,
  label,
  count,
}: {
  to: string;
  label: string;
  count: number;
}) {
  return (
    <NavLink
      to={to}
      tabIndex={-1}
      className={({ isActive }) =>
        `flex items-center gap-2 shrink-0 px-3 min-h-11 md:min-h-0 py-2.5 md:py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] border-b-2 transition-colors duration-150 ${
          isActive
            ? "border-accent text-text"
            : "border-transparent text-muted hover:text-text hover:border-border-2"
        }`
      }
    >
      {label}
      {count > 0 && (
        <span className="text-[10px] text-accent font-mono tabular-nums">
          {count}
        </span>
      )}
    </NavLink>
  );
}

export interface TopbarProps {
  isSynced: boolean;
  onMenuClick?: () => void;
  menuOpen?: boolean;
}

export default function Topbar({
  isSynced,
  onMenuClick,
  menuOpen,
}: TopbarProps) {
  const { user, signOut } = useAuth();
  const inboxTasks = useTasks("inbox");
  const todayTasks = useTasks("today");

  return (
    <header className="flex items-center gap-2 h-12 min-h-12 px-2 sm:px-4 border-b border-[0.5px] border-border bg-surface shrink-0">
      <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
        {onMenuClick ? (
          <button
            type="button"
            className="md:hidden flex items-center justify-center w-11 h-11 shrink-0 text-muted hover:text-text transition-colors duration-150 outline-none"
            onClick={onMenuClick}
            aria-label={
              menuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={menuOpen ?? false}
            aria-controls="mobile-spaces-nav"
          >
            <svg
              width="18"
              height="14"
              viewBox="0 0 18 14"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M0 1h18M0 7h18M0 13h18"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="square"
              />
            </svg>
          </button>
        ) : null}
        <span className="w-2 h-2 bg-accent shrink-0 shadow-laser" />
        <span className="font-mono text-[11px] font-semibold tracking-[0.35em] uppercase text-text truncate max-w-[4.5rem] sm:max-w-none">
          Sift
        </span>
      </div>

      <nav
        className="flex-1 min-w-0 flex items-stretch justify-center overflow-x-auto [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]"
        aria-label="Main views"
      >
        <div className="flex items-stretch gap-0 mx-auto">
          <NavTab to="/inbox" label="Inbox" count={inboxTasks.length} />
          <NavTab to="/today" label="Today" count={todayTasks.length} />
          <NavTab to="/projects" label="Projects" count={0} />
        </div>
      </nav>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0 justify-end">
        <SyncBadge isSynced={isSynced} />
        {user ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => void signOut()}
            className="min-w-11 min-h-11 w-11 h-11 md:min-w-7 md:min-h-7 md:w-7 md:h-7 bg-accent flex items-center justify-center text-bg text-[11px] font-mono font-medium hover:bg-accent/80 transition-colors duration-150"
            title="Sign out"
            aria-label="Sign out"
          >
            {(user.email ?? "U")[0].toUpperCase()}
          </button>
        ) : null}
      </div>
    </header>
  );
}
