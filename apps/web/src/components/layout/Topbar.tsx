import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTasks } from '../../hooks/useTasks';

function SyncBadge({ isSynced }: { isSynced: boolean }) {
  return (
    <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
      <span
        className={`w-1.5 h-1.5 shrink-0 ${isSynced ? 'bg-green' : 'bg-dim animate-pulse'}`}
      />
      {isSynced ? 'Synced' : 'Local'}
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
        `flex items-center gap-2 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] border-b-2 transition-all duration-150 ${
          isActive
            ? 'border-accent text-text'
            : 'border-transparent text-muted hover:text-text hover:border-border-2'
        }`
      }
    >
      {label}
      {count > 0 && (
        <span className="text-[10px] text-accent font-mono tabular-nums">{count}</span>
      )}
    </NavLink>
  );
}

export default function Topbar({ isSynced }: { isSynced: boolean }) {
  const { user, signOut } = useAuth();
  const inboxTasks = useTasks('inbox');
  const todayTasks = useTasks('today');

  return (
    <header className="flex items-center justify-between h-12 px-4 border-b border-[0.5px] border-border bg-surface shrink-0">
      <div className="flex items-center gap-2.5 w-48 shrink-0">
        <span
          className="w-2 h-2 bg-accent shrink-0"
          style={{ boxShadow: '0 0 8px rgba(255, 79, 0, 0.4)' }}
        />
        <span className="font-mono text-[11px] font-semibold tracking-[0.35em] uppercase text-text">
          Sift
        </span>
      </div>

      <nav className="flex items-center gap-0">
        <NavTab to="/inbox" label="Inbox" count={inboxTasks.length} />
        <NavTab to="/today" label="Today" count={todayTasks.length} />
        <NavTab to="/projects" label="Projects" count={0} />
      </nav>

      <div className="flex items-center gap-4 w-48 justify-end">
        <SyncBadge isSynced={isSynced} />
        {user ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => void signOut()}
            className="w-7 h-7 bg-accent flex items-center justify-center text-white text-[11px] font-mono font-medium hover:bg-accent/80 transition-colors"
            title="Sign out"
          >
            {(user.email ?? 'U')[0].toUpperCase()}
          </button>
        ) : null}
      </div>
    </header>
  );
}
