import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTasks } from '../../hooks/useTasks';

function SyncBadge({ isSynced }: { isSynced: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted">
      <span
        className={`w-1.5 h-1.5 rounded-full ${isSynced ? 'bg-green' : 'bg-muted'}`}
      />
      {isSynced ? 'Synced' : 'Local only'}
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
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
          isActive
            ? 'bg-surface-2 text-text shadow-[inset_0_0_0_1px_rgba(94,106,210,0.25)]'
            : 'text-muted hover:text-text hover:bg-surface-2'
        }`
      }
    >
      {label}
      {count > 0 && (
        <span className="text-xs text-muted tabular-nums">{count}</span>
      )}
    </NavLink>
  );
}

export default function Topbar({ isSynced }: { isSynced: boolean }) {
  const { user, signOut } = useAuth();
  const inboxTasks = useTasks('inbox');
  const todayTasks = useTasks('today');

  return (
    <header className="flex items-center justify-between h-12 px-4 border-b border-border bg-surface shrink-0 backdrop-blur-sm bg-surface/90">
      <span className="text-text text-sm font-semibold tracking-tight w-48 shrink-0">
        Speedy Tasks
      </span>

      <nav className="flex items-center gap-1">
        <NavTab to="/inbox" label="Inbox" count={inboxTasks.length} />
        <NavTab to="/today" label="Today" count={todayTasks.length} />
        <NavTab to="/projects" label="Projects" count={0} />
      </nav>

      <div className="flex items-center gap-4 w-48 justify-end">
        <SyncBadge isSynced={isSynced} />
        {user ? (
          <button
            type="button"
            onClick={() => void signOut()}
            className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-white text-xs font-medium hover:bg-accent/80 transition-colors"
            title="Sign out"
          >
            {(user.email ?? 'U')[0].toUpperCase()}
          </button>
        ) : null}
      </div>
    </header>
  );
}
