# Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `apps/web` — the Vite + React + Tailwind web app for Speedy Tasks, featuring keyboard-first task management with local-first Dexie storage and optional Supabase sync.

**Architecture:** Single-page React app using React Router v6 for navigation across Inbox, Today, and Projects views. All data reads go through `useLiveQuery` (Dexie) so the UI updates reactively to local changes; a `SyncService` pushes/pulls against Supabase in the background using last-write-wins semantics. The app imports types and the `db` singleton from `@sift/shared`.

**Tech Stack:** Vite 5, React 18, React Router v6, Tailwind CSS v3, Dexie 4 + dexie-react-hooks, @supabase/supabase-js, nanoid 5, Vitest 1, @testing-library/react 14, fake-indexeddb 5

---

## File Map

| File | Responsibility |
|------|----------------|
| `apps/web/package.json` | App manifest, scripts, all direct dependencies |
| `apps/web/vite.config.ts` | Vite config with React plugin and Vitest config |
| `apps/web/tailwind.config.ts` | Tailwind config with custom design tokens |
| `apps/web/postcss.config.js` | PostCSS config required by Tailwind v3 |
| `apps/web/tsconfig.json` | TypeScript config extending monorepo base |
| `apps/web/index.html` | HTML entry point, mounts `#root` |
| `apps/web/.env.example` | Documents required env vars (Supabase URL + anon key) |
| `apps/web/vercel.json` | Vercel deployment config pointing to monorepo build |
| `apps/web/src/main.tsx` | ReactDOM.createRoot, wraps App in providers |
| `apps/web/src/App.tsx` | React Router root, ProtectedRoute, route tree |
| `apps/web/src/index.css` | Tailwind directives + CSS custom properties |
| `apps/web/src/lib/supabase.ts` | Supabase client singleton created from env vars |
| `apps/web/src/lib/db.ts` | Re-exports `db` from `@sift/shared` |
| `apps/web/src/contexts/AuthContext.tsx` | Supabase auth state, session listener, provider + hook |
| `apps/web/src/pages/AuthPage.tsx` | Google OAuth + magic-link login UI |
| `apps/web/src/components/layout/AppLayout.tsx` | Topbar + Sidebar + `<Outlet />` content slot |
| `apps/web/src/components/layout/Topbar.tsx` | Nav tabs with live counts, sync badge, avatar |
| `apps/web/src/components/layout/Sidebar.tsx` | Global view links + collapsible spaces/projects |
| `apps/web/src/components/layout/HintBar.tsx` | Persistent keyboard shortcut reference strip |
| `apps/web/src/components/TaskRow.tsx` | 36px task row with focus border, late state, space dot |
| `apps/web/src/components/TaskList.tsx` | Active section + collapsed Done section |
| `apps/web/src/components/InputBar.tsx` | SmartInput wrapper that writes completed tasks to Dexie |
| `apps/web/src/hooks/useTasks.ts` | `useInboxTasks`, `useTodayTasks`, `useProjectTasks` via useLiveQuery |
| `apps/web/src/hooks/useSpacesProjects.ts` | Live Dexie query returning all spaces and projects |
| `apps/web/src/hooks/useKeyboardNav.ts` | j/k/Enter/Backspace focus and mutation handlers |
| `apps/web/src/views/InboxView.tsx` | Inbox view: renders TaskList + InputBar |
| `apps/web/src/views/TodayView.tsx` | Today view: renders TaskList + InputBar |
| `apps/web/src/views/ProjectsView.tsx` | Projects view: grouped by space → project with progress bars |
| `apps/web/src/services/SyncService.ts` | LWW sync: push unsynced, pull remote, merge, Realtime |
| `apps/web/src/__tests__/setup.ts` | fake-indexeddb auto-import + @testing-library/jest-dom |
| `apps/web/src/__tests__/useTasks.test.ts` | Tests for useInboxTasks, useTodayTasks, useProjectTasks |
| `apps/web/src/__tests__/useKeyboardNav.test.ts` | Tests for focus movement, toggle done, archive |
| `apps/web/src/__tests__/TaskRow.test.tsx` | Tests for focused state, late styling, space dot, click |
| `apps/web/src/__tests__/SyncService.test.ts` | Tests for push, pull, merge, no-op when logged out |

---

## Task 1: Bootstrap apps/web

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/index.html`

- [ ] **Step 1: Create apps/web/package.json**

```json
{
  "name": "web",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@sift/shared": "*",
    "@supabase/supabase-js": "^2.43.0",
    "dexie": "^4.0.0",
    "dexie-react-hooks": "^1.1.7",
    "nanoid": "^5.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.23.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^14.3.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "fake-indexeddb": "^5.0.0",
    "jsdom": "^24.1.0",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create apps/web/vite.config.ts**

```typescript
// apps/web/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/__tests__/setup.ts'],
    globals: true,
  },
});
```

- [ ] **Step 3: Create apps/web/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create apps/web/index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
    <title>Speedy Tasks</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create src directory structure**

```bash
mkdir -p apps/web/src/lib \
          apps/web/src/contexts \
          apps/web/src/pages \
          apps/web/src/components/layout \
          apps/web/src/hooks \
          apps/web/src/views \
          apps/web/src/services \
          apps/web/src/__tests__
```

- [ ] **Step 6: Install dependencies**

```bash
cd apps/web && npm install
```

Expected: `node_modules/@sift/shared` symlinked to `packages/shared`, `node_modules/react-router-dom` present.

- [ ] **Step 7: Commit**

```bash
git add apps/web/package.json apps/web/vite.config.ts apps/web/tsconfig.json apps/web/index.html
git commit -m "chore: bootstrap apps/web package"
```

---

## Task 2: Design tokens — Tailwind config + CSS vars

**Files:**
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.js`
- Create: `apps/web/src/index.css`

- [ ] **Step 1: Create apps/web/tailwind.config.ts**

```typescript
// apps/web/tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#080808',
        surface: '#0e0e0e',
        'surface-2': '#141414',
        border: '#1f1f1f',
        'border-2': '#262626',
        text: '#e2e2e2',
        muted: '#666666',
        dim: '#444444',
        accent: '#5E6AD2',
        red: '#ff4d4d',
        green: '#4ade80',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      height: {
        'task-row': '36px',
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 2: Create apps/web/postcss.config.js**

```javascript
// apps/web/postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 3: Create apps/web/src/index.css**

```css
/* apps/web/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-bg: #080808;
  --color-surface: #0e0e0e;
  --color-surface-2: #141414;
  --color-border: #1f1f1f;
  --color-border-2: #262626;
  --color-text: #e2e2e2;
  --color-muted: #666666;
  --color-dim: #444444;
  --color-accent: #5e6ad2;
  --color-red: #ff4d4d;
  --color-green: #4ade80;
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  height: 100%;
  margin: 0;
  padding: 0;
}

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: Inter, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 4px;
}
::-webkit-scrollbar-track {
  background: var(--color-bg);
}
::-webkit-scrollbar-thumb {
  background: var(--color-border-2);
  border-radius: 2px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--color-dim);
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/tailwind.config.ts apps/web/postcss.config.js apps/web/src/index.css
git commit -m "feat(web): add Tailwind design tokens and CSS variables"
```

---

## Task 3: Supabase client + .env.example

**Files:**
- Create: `apps/web/.env.example`
- Create: `apps/web/src/lib/supabase.ts`
- Create: `apps/web/src/lib/db.ts`

- [ ] **Step 1: Create apps/web/.env.example**

```
# Supabase project URL (from Project Settings > API)
VITE_SUPABASE_URL=https://your-project.supabase.co

# Supabase anon (public) key
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

- [ ] **Step 2: Create apps/web/src/lib/supabase.ts**

```typescript
// apps/web/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Copy .env.example to .env.local and fill in values.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 3: Create apps/web/src/lib/db.ts**

```typescript
// apps/web/src/lib/db.ts
// Re-export the shared Dexie singleton so app code imports from one place.
export { db } from '@sift/shared';
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/.env.example apps/web/src/lib/supabase.ts apps/web/src/lib/db.ts
git commit -m "feat(web): add Supabase client singleton and db re-export"
```

---

## Task 4: AuthContext + AuthPage

**Files:**
- Create: `apps/web/src/contexts/AuthContext.tsx`
- Create: `apps/web/src/pages/AuthPage.tsx`

- [ ] **Step 1: Create apps/web/src/contexts/AuthContext.tsx**

```tsx
// apps/web/src/contexts/AuthContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hydrate from existing session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  }

  async function signInWithMagicLink(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signInWithGoogle,
        signInWithMagicLink,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
```

- [ ] **Step 2: Create apps/web/src/pages/AuthPage.tsx**

```tsx
// apps/web/src/pages/AuthPage.tsx
import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AuthPage() {
  const { user, loading, signInWithGoogle, signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/inbox" replace />;

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signInWithMagicLink(email);
      setMagicSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <h1 className="text-text text-2xl font-semibold tracking-tight">
            Speedy Tasks
          </h1>
          <p className="text-muted text-sm mt-2">
            Keyboard-first task management
          </p>
        </div>

        <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
          {magicSent ? (
            <div className="text-center py-4">
              <p className="text-text text-sm">
                Check your email — a magic link is on its way to{' '}
                <span className="text-accent">{email}</span>.
              </p>
            </div>
          ) : (
            <>
              {/* Google OAuth */}
              <button
                onClick={signInWithGoogle}
                className="w-full flex items-center justify-center gap-3 bg-surface-2 hover:bg-border text-text text-sm font-medium px-4 py-2.5 rounded-md border border-border-2 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                  />
                  <path
                    fill="#34A853"
                    d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
                  />
                  <path
                    fill="#EA4335"
                    d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.169 6.656 3.58 9 3.58z"
                  />
                </svg>
                Continue with Google
              </button>

              <div className="relative flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-muted text-xs">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Magic link */}
              <form onSubmit={handleMagicLink} className="space-y-3">
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-2 border border-border-2 rounded-md px-3 py-2 text-text text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                />
                {error && (
                  <p className="text-red text-xs">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-md transition-colors"
                >
                  {submitting ? 'Sending…' : 'Send magic link'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-muted text-xs mt-6">
          No account required — works offline without signing in.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/contexts/AuthContext.tsx apps/web/src/pages/AuthPage.tsx
git commit -m "feat(web): add AuthContext and AuthPage with Google OAuth + magic link"
```

---

## Task 5: AppLayout + Topbar + Sidebar + HintBar

**Files:**
- Create: `apps/web/src/components/layout/AppLayout.tsx`
- Create: `apps/web/src/components/layout/Topbar.tsx`
- Create: `apps/web/src/components/layout/Sidebar.tsx`
- Create: `apps/web/src/components/layout/HintBar.tsx`

- [ ] **Step 1: Create apps/web/src/components/layout/Topbar.tsx**

```tsx
// apps/web/src/components/layout/Topbar.tsx
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
            ? 'bg-surface-2 text-text'
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
    <header className="flex items-center justify-between h-12 px-4 border-b border-border bg-surface shrink-0">
      {/* Left: brand */}
      <span className="text-text text-sm font-semibold tracking-tight w-48 shrink-0">
        Speedy Tasks
      </span>

      {/* Center: tabs */}
      <nav className="flex items-center gap-1">
        <NavTab to="/inbox" label="Inbox" count={inboxTasks.length} />
        <NavTab to="/today" label="Today" count={todayTasks.length} />
        <NavTab to="/projects" label="Projects" count={0} />
      </nav>

      {/* Right: sync badge + avatar */}
      <div className="flex items-center gap-4 w-48 justify-end">
        <SyncBadge isSynced={isSynced} />
        {user ? (
          <button
            onClick={signOut}
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
```

- [ ] **Step 2: Create apps/web/src/components/layout/Sidebar.tsx**

```tsx
// apps/web/src/components/layout/Sidebar.tsx
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSpacesProjects } from '../../hooks/useSpacesProjects';

function SidebarLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `block px-3 py-1.5 rounded-md text-sm transition-colors ${
          isActive
            ? 'bg-surface-2 text-text'
            : 'text-muted hover:text-text hover:bg-surface-2'
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
    <aside className="w-48 shrink-0 flex flex-col border-r border-border bg-surface overflow-y-auto">
      {/* Global views */}
      <div className="p-2 space-y-0.5">
        <SidebarLink to="/inbox" label="Inbox" />
        <SidebarLink to="/today" label="Today" />
        <SidebarLink to="/projects" label="Projects" />
      </div>

      <div className="h-px bg-border mx-2 my-1" />

      {/* Spaces + projects */}
      <div className="p-2 space-y-1 flex-1">
        {spacesWithProjects.map(({ space, projects }) => (
          <div key={space.id}>
            <button
              onClick={() => toggleSpace(space.id)}
              className="w-full flex items-center gap-2 px-2 py-1 rounded-md text-xs text-muted hover:text-text transition-colors"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: space.color }}
              />
              <span className="font-medium uppercase tracking-wide flex-1 text-left truncate">
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
                    to={`/projects`}
                    className="block px-2 py-1 rounded-md text-xs text-muted hover:text-text transition-colors truncate"
                  >
                    {project.name}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Login nudge for logged-out users */}
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
```

- [ ] **Step 3: Create apps/web/src/components/layout/HintBar.tsx**

```tsx
// apps/web/src/components/layout/HintBar.tsx

interface Hint {
  keys: string[];
  label: string;
}

const HINTS: Hint[] = [
  { keys: ['j', 'k'], label: 'Move' },
  { keys: ['Enter'], label: 'Done' },
  { keys: ['Backspace'], label: 'Archive' },
  { keys: ['w'], label: '@working date' },
  { keys: ['p'], label: '@project' },
  { keys: ['d'], label: '@due date' },
  { keys: ['⌘+Enter'], label: 'Save' },
];

function Key({ label }: { label: string }) {
  return (
    <kbd className="inline-flex items-center px-1.5 py-0.5 rounded border border-border-2 bg-surface-2 text-dim font-mono text-[10px] leading-none">
      {label}
    </kbd>
  );
}

export default function HintBar() {
  return (
    <div className="flex items-center gap-6 px-4 py-2 border-t border-border bg-surface shrink-0 overflow-x-auto">
      {HINTS.map((hint) => (
        <div key={hint.label} className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1">
            {hint.keys.map((k) => (
              <Key key={k} label={k} />
            ))}
          </div>
          <span className="text-muted text-xs">{hint.label}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create apps/web/src/components/layout/AppLayout.tsx**

```tsx
// apps/web/src/components/layout/AppLayout.tsx
import { Outlet } from 'react-router-dom';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import HintBar from './HintBar';

interface AppLayoutProps {
  isSynced: boolean;
}

export default function AppLayout({ isSynced }: AppLayoutProps) {
  return (
    <div className="flex flex-col h-full bg-bg">
      <Topbar isSynced={isSynced} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <Outlet />
          </div>
          <HintBar />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/layout/
git commit -m "feat(web): add AppLayout, Topbar, Sidebar, and HintBar components"
```

---

## Task 6: Failing tests for useTasks

**Files:**
- Create: `apps/web/src/__tests__/setup.ts`
- Create: `apps/web/src/__tests__/useTasks.test.ts`

- [ ] **Step 1: Create apps/web/src/__tests__/setup.ts**

```typescript
// apps/web/src/__tests__/setup.ts
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';
```

- [ ] **Step 2: Create apps/web/src/__tests__/useTasks.test.ts**

```typescript
// apps/web/src/__tests__/useTasks.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { db } from '../lib/db';
import { useInboxTasks, useTodayTasks, useProjectTasks } from '../hooks/useTasks';
import type { Space, Project, Task } from '@sift/shared';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeSpace(overrides?: Partial<Space>): Space {
  const now = new Date();
  return {
    id: 'space-1',
    name: 'Work',
    color: '#5E6AD2',
    createdAt: now,
    updatedAt: now,
    synced: true,
    ...overrides,
  };
}

function makeProject(overrides?: Partial<Project>): Project {
  const now = new Date();
  return {
    id: 'project-1',
    name: 'General',
    spaceId: 'space-1',
    createdAt: now,
    updatedAt: now,
    synced: true,
    ...overrides,
  };
}

function makeTask(overrides?: Partial<Task>): Task {
  const now = new Date();
  return {
    id: 'task-1',
    title: 'Test task',
    projectId: 'project-1',
    status: 'inbox',
    workingDate: null,
    dueDate: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    synced: true,
    ...overrides,
  };
}

function yesterday(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function tomorrow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(async () => {
  await db.tasks.clear();
  await db.projects.clear();
  await db.spaces.clear();
  await db.spaces.add(makeSpace());
  await db.projects.add(makeProject());
});

// ── useInboxTasks ─────────────────────────────────────────────────────────────

describe('useInboxTasks', () => {
  it('returns tasks with workingDate null and non-terminal status', async () => {
    await db.tasks.bulkAdd([
      makeTask({ id: 't1', status: 'inbox', workingDate: null }),
      makeTask({ id: 't2', status: 'todo', workingDate: today() }),   // has workingDate — excluded
      makeTask({ id: 't3', status: 'done', workingDate: null }),       // done — excluded
      makeTask({ id: 't4', status: 'archived', workingDate: null }),   // archived — excluded
    ]);

    const { result } = renderHook(() => useInboxTasks());
    await waitFor(() => expect(result.current.length).toBeGreaterThan(0));

    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe('t1');
  });

  it('returns empty array when no inbox tasks exist', async () => {
    const { result } = renderHook(() => useInboxTasks());
    await waitFor(() => expect(result.current).toBeDefined());
    expect(result.current).toHaveLength(0);
  });
});

// ── useTodayTasks ─────────────────────────────────────────────────────────────

describe('useTodayTasks', () => {
  it('returns tasks where workingDate <= today and status is not done/archived', async () => {
    await db.tasks.bulkAdd([
      makeTask({ id: 't1', status: 'todo', workingDate: today() }),
      makeTask({ id: 't2', status: 'todo', workingDate: yesterday() }),
      makeTask({ id: 't3', status: 'todo', workingDate: tomorrow() }),   // future — excluded
      makeTask({ id: 't4', status: 'done', workingDate: today() }),       // done — excluded
      makeTask({ id: 't5', status: 'archived', workingDate: yesterday() }), // archived — excluded
    ]);

    const { result } = renderHook(() => useTodayTasks());
    await waitFor(() => expect(result.current.length).toBeGreaterThan(0));

    const ids = result.current.map((t) => t.id).sort();
    expect(ids).toEqual(['t1', 't2']);
  });
});

// ── useProjectTasks ───────────────────────────────────────────────────────────

describe('useProjectTasks', () => {
  it('groups tasks by space then project', async () => {
    const space2 = makeSpace({ id: 'space-2', name: 'Personal', color: '#4ade80' });
    const project2 = makeProject({ id: 'project-2', name: 'Errands', spaceId: 'space-2' });
    await db.spaces.add(space2);
    await db.projects.add(project2);

    await db.tasks.bulkAdd([
      makeTask({ id: 't1', projectId: 'project-1', status: 'todo' }),
      makeTask({ id: 't2', projectId: 'project-2', status: 'inbox' }),
    ]);

    const { result } = renderHook(() => useProjectTasks());
    await waitFor(() => expect(result.current.length).toBeGreaterThan(0));

    expect(result.current).toHaveLength(2);
    const workSpace = result.current.find((g) => g.space.id === 'space-1');
    const personalSpace = result.current.find((g) => g.space.id === 'space-2');

    expect(workSpace).toBeDefined();
    expect(workSpace!.projects[0].tasks).toHaveLength(1);
    expect(personalSpace).toBeDefined();
    expect(personalSpace!.projects[0].tasks).toHaveLength(1);
  });

  it('includes done tasks in project groups (for progress bars)', async () => {
    await db.tasks.bulkAdd([
      makeTask({ id: 't1', status: 'todo' }),
      makeTask({ id: 't2', status: 'done' }),
    ]);

    const { result } = renderHook(() => useProjectTasks());
    await waitFor(() => expect(result.current.length).toBeGreaterThan(0));

    expect(result.current[0].projects[0].tasks).toHaveLength(2);
  });
});
```

- [ ] **Step 3: Run tests and confirm they fail**

```bash
cd apps/web && npm test -- --reporter=verbose 2>&1 | head -40
```

Expected: tests fail with `Cannot find module '../hooks/useTasks'`.

- [ ] **Step 4: Commit failing tests**

```bash
git add apps/web/src/__tests__/setup.ts apps/web/src/__tests__/useTasks.test.ts
git commit -m "test(web): add failing tests for useTasks hook"
```

---

## Task 7: Implement useTasks + useSpacesProjects

**Files:**
- Create: `apps/web/src/hooks/useTasks.ts`
- Create: `apps/web/src/hooks/useSpacesProjects.ts`

- [ ] **Step 1: Create apps/web/src/hooks/useSpacesProjects.ts**

```typescript
// apps/web/src/hooks/useSpacesProjects.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { Space, Project } from '@sift/shared';

export interface SpaceWithProjects {
  space: Space;
  projects: Project[];
}

export function useSpacesProjects(): { spacesWithProjects: SpaceWithProjects[] } {
  const spacesWithProjects = useLiveQuery(async () => {
    const spaces = await db.spaces.orderBy('name').toArray();
    const projects = await db.projects.orderBy('name').toArray();

    return spaces.map((space) => ({
      space,
      projects: projects.filter((p) => p.spaceId === space.id),
    }));
  }, []) ?? [];

  return { spacesWithProjects };
}
```

- [ ] **Step 2: Create apps/web/src/hooks/useTasks.ts**

```typescript
// apps/web/src/hooks/useTasks.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { Task, Space, Project } from '@sift/shared';

const TERMINAL_STATUSES = ['done', 'archived'] as const;

/** Inbox: workingDate === null AND status not in done/archived */
export function useInboxTasks(): Task[] {
  return useLiveQuery(
    () =>
      db.tasks
        .filter(
          (t) =>
            t.workingDate === null &&
            !TERMINAL_STATUSES.includes(t.status as typeof TERMINAL_STATUSES[number])
        )
        .toArray(),
    []
  ) ?? [];
}

/** Today: workingDate <= today AND status not in done/archived */
export function useTodayTasks(): Task[] {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  return useLiveQuery(
    () =>
      db.tasks
        .filter(
          (t) =>
            t.workingDate !== null &&
            t.workingDate <= todayStart &&
            !TERMINAL_STATUSES.includes(t.status as typeof TERMINAL_STATUSES[number])
        )
        .toArray(),
    []
  ) ?? [];
}

export interface ProjectGroup {
  project: Project;
  tasks: Task[];
}

export interface SpaceGroup {
  space: Space;
  projects: ProjectGroup[];
}

/** Projects: all tasks (including done) grouped by space → project */
export function useProjectTasks(): SpaceGroup[] {
  return useLiveQuery(async () => {
    const [spaces, projects, tasks] = await Promise.all([
      db.spaces.orderBy('name').toArray(),
      db.projects.orderBy('name').toArray(),
      db.tasks.where('status').notEqual('archived').toArray(),
    ]);

    return spaces.map((space) => {
      const spaceProjects = projects.filter((p) => p.spaceId === space.id);
      return {
        space,
        projects: spaceProjects.map((project) => ({
          project,
          tasks: tasks.filter((t) => t.projectId === project.id),
        })),
      };
    });
  }, []) ?? [];
}

/**
 * Convenience overload used by Topbar for live task counts.
 * 'inbox' | 'today' → returns the appropriate task array
 */
export function useTasks(view: 'inbox' | 'today'): Task[] {
  const inbox = useInboxTasks();
  const today = useTodayTasks();
  return view === 'inbox' ? inbox : today;
}
```

- [ ] **Step 3: Run tests and confirm they pass**

```bash
cd apps/web && npm test -- --reporter=verbose 2>&1 | grep -E '(PASS|FAIL|✓|×)'
```

Expected: all `useTasks.test.ts` tests pass (6 tests).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/hooks/useTasks.ts apps/web/src/hooks/useSpacesProjects.ts
git commit -m "feat(web): implement useTasks and useSpacesProjects hooks"
```

---

## Task 8: Failing tests for useKeyboardNav

**Files:**
- Create: `apps/web/src/__tests__/useKeyboardNav.test.ts`

- [ ] **Step 1: Create apps/web/src/__tests__/useKeyboardNav.test.ts**

```typescript
// apps/web/src/__tests__/useKeyboardNav.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { db } from '../lib/db';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import type { Task } from '@sift/shared';

function makeTask(overrides?: Partial<Task>): Task {
  const now = new Date();
  return {
    id: 'task-1',
    title: 'Test',
    projectId: 'project-1',
    status: 'inbox',
    workingDate: null,
    dueDate: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    synced: true,
    ...overrides,
  };
}

const TASKS: Task[] = [
  makeTask({ id: 'a', title: 'Task A' }),
  makeTask({ id: 'b', title: 'Task B' }),
  makeTask({ id: 'c', title: 'Task C' }),
];

function makeKeyEvent(key: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, bubbles: true });
}

beforeEach(async () => {
  await db.tasks.clear();
  await db.projects.clear();
  await db.spaces.clear();
});

describe('useKeyboardNav', () => {
  it('starts with focusedId null', () => {
    const { result } = renderHook(() => useKeyboardNav());
    expect(result.current.focusedId).toBeNull();
  });

  it('j / ArrowDown moves focus to next task', () => {
    const { result } = renderHook(() => useKeyboardNav());

    act(() => {
      result.current.setFocusedId('a');
    });

    act(() => {
      result.current.handleKeyDown(makeKeyEvent('j'), TASKS);
    });

    expect(result.current.focusedId).toBe('b');
  });

  it('k / ArrowUp moves focus to previous task', () => {
    const { result } = renderHook(() => useKeyboardNav());

    act(() => {
      result.current.setFocusedId('c');
    });

    act(() => {
      result.current.handleKeyDown(makeKeyEvent('k'), TASKS);
    });

    expect(result.current.focusedId).toBe('b');
  });

  it('j does not move past the last task', () => {
    const { result } = renderHook(() => useKeyboardNav());

    act(() => {
      result.current.setFocusedId('c');
    });

    act(() => {
      result.current.handleKeyDown(makeKeyEvent('j'), TASKS);
    });

    expect(result.current.focusedId).toBe('c');
  });

  it('k does not move before the first task', () => {
    const { result } = renderHook(() => useKeyboardNav());

    act(() => {
      result.current.setFocusedId('a');
    });

    act(() => {
      result.current.handleKeyDown(makeKeyEvent('k'), TASKS);
    });

    expect(result.current.focusedId).toBe('a');
  });

  it('ArrowDown works like j', () => {
    const { result } = renderHook(() => useKeyboardNav());

    act(() => {
      result.current.setFocusedId('a');
    });

    act(() => {
      result.current.handleKeyDown(makeKeyEvent('ArrowDown'), TASKS);
    });

    expect(result.current.focusedId).toBe('b');
  });

  it('ArrowUp works like k', () => {
    const { result } = renderHook(() => useKeyboardNav());

    act(() => {
      result.current.setFocusedId('b');
    });

    act(() => {
      result.current.handleKeyDown(makeKeyEvent('ArrowUp'), TASKS);
    });

    expect(result.current.focusedId).toBe('a');
  });

  it('Enter toggles focused task from inbox to done', async () => {
    await db.spaces.add({ id: 'space-1', name: 'Work', color: '#5E6AD2', createdAt: new Date(), updatedAt: new Date(), synced: true });
    await db.projects.add({ id: 'project-1', name: 'General', spaceId: 'space-1', createdAt: new Date(), updatedAt: new Date(), synced: true });
    await db.tasks.add(TASKS[0]);

    const { result } = renderHook(() => useKeyboardNav());

    act(() => {
      result.current.setFocusedId('a');
    });

    await act(async () => {
      result.current.handleKeyDown(makeKeyEvent('Enter'), TASKS);
      await new Promise((r) => setTimeout(r, 10));
    });

    const updated = await db.tasks.get('a');
    expect(updated!.status).toBe('done');
    expect(updated!.completedAt).not.toBeNull();
  });

  it('Enter toggles focused task from done back to inbox', async () => {
    await db.spaces.add({ id: 'space-1', name: 'Work', color: '#5E6AD2', createdAt: new Date(), updatedAt: new Date(), synced: true });
    await db.projects.add({ id: 'project-1', name: 'General', spaceId: 'space-1', createdAt: new Date(), updatedAt: new Date(), synced: true });
    const doneTask = { ...TASKS[0], status: 'done' as const, completedAt: new Date() };
    await db.tasks.add(doneTask);

    const { result } = renderHook(() => useKeyboardNav());
    act(() => result.current.setFocusedId('a'));

    await act(async () => {
      result.current.handleKeyDown(makeKeyEvent('Enter'), [doneTask]);
      await new Promise((r) => setTimeout(r, 10));
    });

    const updated = await db.tasks.get('a');
    expect(updated!.status).toBe('inbox');
    expect(updated!.completedAt).toBeNull();
  });

  it('Backspace archives the focused task', async () => {
    await db.spaces.add({ id: 'space-1', name: 'Work', color: '#5E6AD2', createdAt: new Date(), updatedAt: new Date(), synced: true });
    await db.projects.add({ id: 'project-1', name: 'General', spaceId: 'space-1', createdAt: new Date(), updatedAt: new Date(), synced: true });
    await db.tasks.add(TASKS[1]);

    const { result } = renderHook(() => useKeyboardNav());
    act(() => result.current.setFocusedId('b'));

    await act(async () => {
      result.current.handleKeyDown(makeKeyEvent('Backspace'), TASKS);
      await new Promise((r) => setTimeout(r, 10));
    });

    const updated = await db.tasks.get('b');
    expect(updated!.status).toBe('archived');
  });

  it('Delete works like Backspace for archiving', async () => {
    await db.spaces.add({ id: 'space-1', name: 'Work', color: '#5E6AD2', createdAt: new Date(), updatedAt: new Date(), synced: true });
    await db.projects.add({ id: 'project-1', name: 'General', spaceId: 'space-1', createdAt: new Date(), updatedAt: new Date(), synced: true });
    await db.tasks.add(TASKS[2]);

    const { result } = renderHook(() => useKeyboardNav());
    act(() => result.current.setFocusedId('c'));

    await act(async () => {
      result.current.handleKeyDown(makeKeyEvent('Delete'), TASKS);
      await new Promise((r) => setTimeout(r, 10));
    });

    const updated = await db.tasks.get('c');
    expect(updated!.status).toBe('archived');
  });
});
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
cd apps/web && npm test -- --reporter=verbose 2>&1 | grep -E '(PASS|FAIL|Cannot find)'
```

Expected: tests fail with `Cannot find module '../hooks/useKeyboardNav'`.

- [ ] **Step 3: Commit failing tests**

```bash
git add apps/web/src/__tests__/useKeyboardNav.test.ts
git commit -m "test(web): add failing tests for useKeyboardNav hook"
```

---

## Task 9: Implement useKeyboardNav

**Files:**
- Create: `apps/web/src/hooks/useKeyboardNav.ts`

- [ ] **Step 1: Create apps/web/src/hooks/useKeyboardNav.ts**

```typescript
// apps/web/src/hooks/useKeyboardNav.ts
import { useState } from 'react';
import { db } from '../lib/db';
import type { Task } from '@sift/shared';

export interface UseKeyboardNavReturn {
  focusedId: string | null;
  setFocusedId: (id: string | null) => void;
  handleKeyDown: (e: KeyboardEvent, tasks: Task[]) => void;
}

export function useKeyboardNav(): UseKeyboardNavReturn {
  const [focusedId, setFocusedId] = useState<string | null>(null);

  function handleKeyDown(e: KeyboardEvent, tasks: Task[]) {
    if (!tasks.length) return;

    const currentIndex = tasks.findIndex((t) => t.id === focusedId);

    switch (e.key) {
      case 'j':
      case 'ArrowDown': {
        e.preventDefault();
        if (currentIndex < tasks.length - 1) {
          setFocusedId(tasks[currentIndex + 1].id);
        }
        break;
      }

      case 'k':
      case 'ArrowUp': {
        e.preventDefault();
        if (currentIndex > 0) {
          setFocusedId(tasks[currentIndex - 1].id);
        }
        break;
      }

      case 'Enter': {
        if (focusedId === null) break;
        const task = tasks.find((t) => t.id === focusedId);
        if (!task) break;

        const now = new Date();
        if (task.status === 'done') {
          db.tasks.update(focusedId, {
            status: task.workingDate ? 'todo' : 'inbox',
            completedAt: null,
            updatedAt: now,
            synced: false,
          });
        } else {
          db.tasks.update(focusedId, {
            status: 'done',
            completedAt: now,
            updatedAt: now,
            synced: false,
          });
        }
        break;
      }

      case 'Backspace':
      case 'Delete': {
        if (focusedId === null) break;
        const now = new Date();
        db.tasks.update(focusedId, {
          status: 'archived',
          updatedAt: now,
          synced: false,
        });
        // Move focus to adjacent task
        if (currentIndex > 0) {
          setFocusedId(tasks[currentIndex - 1].id);
        } else if (tasks.length > 1) {
          setFocusedId(tasks[1].id);
        } else {
          setFocusedId(null);
        }
        break;
      }

      default:
        break;
    }
  }

  return { focusedId, setFocusedId, handleKeyDown };
}
```

- [ ] **Step 2: Run tests and confirm they pass**

```bash
cd apps/web && npm test -- --reporter=verbose 2>&1 | grep -E '(✓|×|PASS|FAIL)'
```

Expected: all 11 `useKeyboardNav.test.ts` tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/hooks/useKeyboardNav.ts
git commit -m "feat(web): implement useKeyboardNav hook"
```

---

## Task 10: Failing tests for TaskRow

**Files:**
- Create: `apps/web/src/__tests__/TaskRow.test.tsx`

- [ ] **Step 1: Create apps/web/src/__tests__/TaskRow.test.tsx**

```tsx
// apps/web/src/__tests__/TaskRow.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskRow from '../components/TaskRow';
import type { Task, Project, Space } from '@sift/shared';

const now = new Date();

const space: Space = {
  id: 'space-1',
  name: 'Work',
  color: '#5E6AD2',
  createdAt: now,
  updatedAt: now,
  synced: true,
};

const project: Project = {
  id: 'project-1',
  name: 'General',
  spaceId: 'space-1',
  createdAt: now,
  updatedAt: now,
  synced: true,
};

const baseTask: Task = {
  id: 'task-1',
  title: 'Write unit tests',
  projectId: 'project-1',
  status: 'inbox',
  workingDate: null,
  dueDate: null,
  createdAt: now,
  updatedAt: now,
  completedAt: null,
  synced: true,
};

describe('TaskRow', () => {
  it('renders the task title', () => {
    render(
      <TaskRow
        task={baseTask}
        project={project}
        space={space}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
    expect(screen.getByText('Write unit tests')).toBeInTheDocument();
  });

  it('applies focused styles when isFocused is true', () => {
    const { container } = render(
      <TaskRow
        task={baseTask}
        project={project}
        space={space}
        isFocused={true}
        onFocus={vi.fn()}
      />
    );
    // The row should have the accent left border class
    const row = container.firstChild as HTMLElement;
    expect(row.className).toMatch(/border-accent/);
  });

  it('does not apply focused styles when isFocused is false', () => {
    const { container } = render(
      <TaskRow
        task={baseTask}
        project={project}
        space={space}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
    const row = container.firstChild as HTMLElement;
    expect(row.className).not.toMatch(/border-accent/);
  });

  it('calls onFocus when the row is clicked', () => {
    const onFocus = vi.fn();
    const { container } = render(
      <TaskRow
        task={baseTask}
        project={project}
        space={space}
        isFocused={false}
        onFocus={onFocus}
      />
    );
    fireEvent.click(container.firstChild as HTMLElement);
    expect(onFocus).toHaveBeenCalledOnce();
  });

  it('renders space dot with space color', () => {
    const { container } = render(
      <TaskRow
        task={baseTask}
        project={project}
        space={space}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
    const dot = container.querySelector('[data-testid="space-dot"]') as HTMLElement;
    expect(dot).toBeInTheDocument();
    expect(dot.style.backgroundColor).toBe('rgb(94, 106, 210)'); // #5E6AD2
  });

  it('shows due date in red when task is late', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const lateTask: Task = { ...baseTask, dueDate: yesterday, status: 'todo' };

    render(
      <TaskRow
        task={lateTask}
        project={project}
        space={space}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );

    const dateEl = screen.getByTestId('due-date');
    expect(dateEl.className).toMatch(/text-red/);
  });

  it('does not show due date in red when task is done', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const doneTask: Task = {
      ...baseTask,
      dueDate: yesterday,
      status: 'done',
      completedAt: new Date(),
    };

    render(
      <TaskRow
        task={doneTask}
        project={project}
        space={space}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );

    const dateEl = screen.getByTestId('due-date');
    expect(dateEl.className).not.toMatch(/text-red/);
  });

  it('shows a link icon when task has sourceUrl', () => {
    const taskWithUrl: Task = { ...baseTask, sourceUrl: 'https://example.com' };

    render(
      <TaskRow
        task={taskWithUrl}
        project={project}
        space={space}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );

    expect(screen.getByTestId('source-url-icon')).toBeInTheDocument();
  });

  it('does not show link icon when task has no sourceUrl', () => {
    render(
      <TaskRow
        task={baseTask}
        project={project}
        space={space}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );

    expect(screen.queryByTestId('source-url-icon')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
cd apps/web && npm test -- --reporter=verbose 2>&1 | grep -E '(PASS|FAIL|Cannot find)'
```

Expected: tests fail with `Cannot find module '../components/TaskRow'`.

- [ ] **Step 3: Commit failing tests**

```bash
git add apps/web/src/__tests__/TaskRow.test.tsx
git commit -m "test(web): add failing tests for TaskRow component"
```

---

## Task 11: Implement TaskRow

**Files:**
- Create: `apps/web/src/components/TaskRow.tsx`

- [ ] **Step 1: Create apps/web/src/components/TaskRow.tsx**

```tsx
// apps/web/src/components/TaskRow.tsx
import type { Task, Project, Space } from '@sift/shared';

export interface TaskRowProps {
  task: Task;
  project: Project;
  space: Space;
  isFocused: boolean;
  onFocus: () => void;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isLate(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return task.dueDate < today;
}

export default function TaskRow({ task, space, isFocused, onFocus }: TaskRowProps) {
  const late = isLate(task);

  return (
    <div
      onClick={onFocus}
      className={`
        flex items-center h-task-row px-3 gap-3 cursor-pointer select-none
        border-l-2 transition-colors
        ${isFocused ? 'border-accent bg-surface-2' : 'border-transparent hover:bg-surface-2/50'}
      `}
    >
      {/* Space dot */}
      <span
        data-testid="space-dot"
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: space.color }}
      />

      {/* Done checkbox circle */}
      <span
        className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center transition-colors ${
          task.status === 'done'
            ? 'border-green bg-green/20'
            : 'border-border-2 hover:border-accent'
        }`}
      >
        {task.status === 'done' && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path
              d="M1.5 4L3 5.5L6.5 2.5"
              stroke="#4ade80"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>

      {/* Title */}
      <span
        className={`flex-1 text-sm truncate ${
          task.status === 'done' ? 'text-muted line-through' : 'text-text'
        }`}
      >
        {task.title}
      </span>

      {/* Source URL icon */}
      {task.sourceUrl && (
        <a
          href={task.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="source-url-icon"
          onClick={(e) => e.stopPropagation()}
          className="text-muted hover:text-accent transition-colors shrink-0"
          title={task.sourceUrl}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
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

      {/* Due date */}
      {task.dueDate && (
        <span
          data-testid="due-date"
          className={`text-xs shrink-0 tabular-nums ${
            late ? 'text-red' : 'text-muted'
          }`}
        >
          {formatDate(task.dueDate)}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run tests and confirm they pass**

```bash
cd apps/web && npm test -- --reporter=verbose 2>&1 | grep -E '(✓|×|PASS|FAIL)'
```

Expected: all 8 `TaskRow.test.tsx` tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/TaskRow.tsx
git commit -m "feat(web): implement TaskRow component"
```

---

## Task 12: Implement TaskList

**Files:**
- Create: `apps/web/src/components/TaskList.tsx`

- [ ] **Step 1: Create apps/web/src/components/TaskList.tsx**

```tsx
// apps/web/src/components/TaskList.tsx
import { useState } from 'react';
import TaskRow from './TaskRow';
import { useSpacesProjects } from '../hooks/useSpacesProjects';
import type { Task } from '@sift/shared';

interface TaskListProps {
  tasks: Task[];
  focusedId: string | null;
  onFocus: (id: string) => void;
}

export default function TaskList({ tasks, focusedId, onFocus }: TaskListProps) {
  const [doneExpanded, setDoneExpanded] = useState(false);
  const { spacesWithProjects } = useSpacesProjects();

  const activeTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'archived');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  function getProjectAndSpace(task: Task) {
    for (const { space, projects } of spacesWithProjects) {
      const project = projects.find((p) => p.id === task.projectId);
      if (project) return { project, space };
    }
    return null;
  }

  return (
    <div className="flex-1">
      {/* Active tasks */}
      {activeTasks.length === 0 && doneTasks.length === 0 && (
        <p className="text-muted text-sm px-4 py-8 text-center">No tasks here.</p>
      )}

      {activeTasks.map((task) => {
        const ctx = getProjectAndSpace(task);
        if (!ctx) return null;
        return (
          <TaskRow
            key={task.id}
            task={task}
            project={ctx.project}
            space={ctx.space}
            isFocused={focusedId === task.id}
            onFocus={() => onFocus(task.id)}
          />
        );
      })}

      {/* Done section */}
      {doneTasks.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setDoneExpanded((v) => !v)}
            className="flex items-center gap-2 px-4 py-1.5 text-xs text-muted hover:text-text transition-colors w-full"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              className={`transition-transform ${doneExpanded ? '' : '-rotate-90'}`}
            >
              <path
                d="M2 3.5L5 6.5L8 3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
            Done · {doneTasks.length}
          </button>

          {doneExpanded &&
            doneTasks.map((task) => {
              const ctx = getProjectAndSpace(task);
              if (!ctx) return null;
              return (
                <TaskRow
                  key={task.id}
                  task={task}
                  project={ctx.project}
                  space={ctx.space}
                  isFocused={focusedId === task.id}
                  onFocus={() => onFocus(task.id)}
                />
              );
            })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/TaskList.tsx
git commit -m "feat(web): implement TaskList with active and done sections"
```

---

## Task 13: Implement InputBar

**Files:**
- Create: `apps/web/src/components/InputBar.tsx`

- [ ] **Step 1: Create apps/web/src/components/InputBar.tsx**

```tsx
// apps/web/src/components/InputBar.tsx
import { SmartInput } from '@sift/shared';
import { db } from '../lib/db';
import { nanoid } from 'nanoid';
import type { Task } from '@sift/shared';

interface InputBarProps {
  /** Default project ID assigned when the user hasn't selected one. */
  defaultProjectId: string;
}

async function handleTaskReady(
  partial: Partial<Task>,
  defaultProjectId: string
): Promise<void> {
  const now = new Date();
  await db.tasks.add({
    id: nanoid(),
    title: partial.title!,
    projectId: partial.projectId ?? defaultProjectId,
    status: partial.workingDate ? 'todo' : 'inbox',
    workingDate: partial.workingDate ?? null,
    dueDate: partial.dueDate ?? null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    synced: false,
  });
}

export default function InputBar({ defaultProjectId }: InputBarProps) {
  return (
    <div className="border-t border-border bg-surface px-4 py-3">
      <SmartInput
        onTaskReady={(partial) => handleTaskReady(partial, defaultProjectId)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/InputBar.tsx
git commit -m "feat(web): implement InputBar wrapping SmartInput with Dexie write"
```

---

## Task 14: Implement InboxView

**Files:**
- Create: `apps/web/src/views/InboxView.tsx`

- [ ] **Step 1: Create apps/web/src/views/InboxView.tsx**

```tsx
// apps/web/src/views/InboxView.tsx
import { useEffect } from 'react';
import { useInboxTasks } from '../hooks/useTasks';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import { useSpacesProjects } from '../hooks/useSpacesProjects';
import TaskList from '../components/TaskList';
import InputBar from '../components/InputBar';

/** Resolve the first available project ID for the InputBar default. */
function useDefaultProjectId(): string {
  const { spacesWithProjects } = useSpacesProjects();
  for (const { projects } of spacesWithProjects) {
    if (projects.length > 0) return projects[0].id;
  }
  return '';
}

export default function InboxView() {
  const tasks = useInboxTasks();
  const { focusedId, setFocusedId, handleKeyDown } = useKeyboardNav();
  const defaultProjectId = useDefaultProjectId();

  // Auto-focus first task when the list loads
  useEffect(() => {
    if (tasks.length > 0 && focusedId === null) {
      setFocusedId(tasks[0].id);
    }
  }, [tasks, focusedId, setFocusedId]);

  // Global key listener while this view is mounted
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't intercept when user is typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      handleKeyDown(e, tasks);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tasks, handleKeyDown]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-6 pb-2">
        <h2 className="text-text text-sm font-medium">Inbox</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        <TaskList tasks={tasks} focusedId={focusedId} onFocus={setFocusedId} />
      </div>

      <InputBar defaultProjectId={defaultProjectId} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/views/InboxView.tsx
git commit -m "feat(web): implement InboxView"
```

---

## Task 15: Implement TodayView

**Files:**
- Create: `apps/web/src/views/TodayView.tsx`

- [ ] **Step 1: Create apps/web/src/views/TodayView.tsx**

```tsx
// apps/web/src/views/TodayView.tsx
import { useEffect } from 'react';
import { useTodayTasks } from '../hooks/useTasks';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import { useSpacesProjects } from '../hooks/useSpacesProjects';
import TaskList from '../components/TaskList';
import InputBar from '../components/InputBar';

function useDefaultProjectId(): string {
  const { spacesWithProjects } = useSpacesProjects();
  for (const { projects } of spacesWithProjects) {
    if (projects.length > 0) return projects[0].id;
  }
  return '';
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function TodayView() {
  const tasks = useTodayTasks();
  const { focusedId, setFocusedId, handleKeyDown } = useKeyboardNav();
  const defaultProjectId = useDefaultProjectId();

  useEffect(() => {
    if (tasks.length > 0 && focusedId === null) {
      setFocusedId(tasks[0].id);
    }
  }, [tasks, focusedId, setFocusedId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      handleKeyDown(e, tasks);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tasks, handleKeyDown]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-6 pb-2">
        <h2 className="text-text text-sm font-medium">Today</h2>
        <p className="text-muted text-xs mt-0.5">{todayLabel()}</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <TaskList tasks={tasks} focusedId={focusedId} onFocus={setFocusedId} />
      </div>

      <InputBar defaultProjectId={defaultProjectId} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/views/TodayView.tsx
git commit -m "feat(web): implement TodayView"
```

---

## Task 16: Implement ProjectsView

**Files:**
- Create: `apps/web/src/views/ProjectsView.tsx`

- [ ] **Step 1: Create apps/web/src/views/ProjectsView.tsx**

```tsx
// apps/web/src/views/ProjectsView.tsx
import { useEffect } from 'react';
import { useProjectTasks } from '../hooks/useTasks';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import TaskRow from '../components/TaskRow';
import InputBar from '../components/InputBar';
import type { Task } from '@sift/shared';

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted tabular-nums">
        {done}/{total}
      </span>
    </div>
  );
}

function useDefaultProjectId(): string {
  const groups = useProjectTasks();
  for (const { projects } of groups) {
    if (projects.length > 0) return projects[0].project.id;
  }
  return '';
}

export default function ProjectsView() {
  const groups = useProjectTasks();
  const { focusedId, setFocusedId, handleKeyDown } = useKeyboardNav();
  const defaultProjectId = useDefaultProjectId();

  // Flatten all active tasks for keyboard navigation
  const allTasks: Task[] = groups.flatMap(({ projects }) =>
    projects.flatMap(({ tasks }) =>
      tasks.filter((t) => t.status !== 'done' && t.status !== 'archived')
    )
  );

  useEffect(() => {
    if (allTasks.length > 0 && focusedId === null) {
      setFocusedId(allTasks[0].id);
    }
  }, [allTasks, focusedId, setFocusedId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      handleKeyDown(e, allTasks);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [allTasks, handleKeyDown]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-6 pb-2">
        <h2 className="text-text text-sm font-medium">Projects</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {groups.map(({ space, projects }) => (
          <div key={space.id} className="mb-6">
            {/* Space header */}
            <div className="flex items-center gap-2 px-4 py-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: space.color }}
              />
              <span className="text-xs text-muted font-medium uppercase tracking-wide">
                {space.name}
              </span>
            </div>

            {projects.map(({ project, tasks }) => {
              const done = tasks.filter((t) => t.status === 'done').length;
              const total = tasks.length;
              const activeTasks = tasks.filter(
                (t) => t.status !== 'done' && t.status !== 'archived'
              );

              return (
                <div key={project.id} className="mb-4">
                  {/* Project header */}
                  <div className="px-4 py-2 border-b border-border">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-text font-medium">
                        {project.name}
                      </span>
                    </div>
                    <ProgressBar done={done} total={total} />
                  </div>

                  {/* Tasks */}
                  {activeTasks.length === 0 ? (
                    <p className="text-muted text-xs px-4 py-3">All done!</p>
                  ) : (
                    activeTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        project={project}
                        space={space}
                        isFocused={focusedId === task.id}
                        onFocus={() => setFocusedId(task.id)}
                      />
                    ))
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {groups.length === 0 && (
          <p className="text-muted text-sm px-4 py-8 text-center">
            No projects yet. Create a task and assign it to a project.
          </p>
        )}
      </div>

      <InputBar defaultProjectId={defaultProjectId} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/views/ProjectsView.tsx
git commit -m "feat(web): implement ProjectsView with progress bars"
```

---

## Task 17: App.tsx + React Router + ProtectedRoute

**Files:**
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`

- [ ] **Step 1: Create apps/web/src/main.tsx**

```tsx
// apps/web/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 2: Create apps/web/src/App.tsx**

```tsx
// apps/web/src/App.tsx
import { useState, useEffect, type ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import AppLayout from './components/layout/AppLayout';
import AuthPage from './pages/AuthPage';
import InboxView from './views/InboxView';
import TodayView from './views/TodayView';
import ProjectsView from './views/ProjectsView';
import { SyncService } from './services/SyncService';
import { supabase } from './lib/supabase';

const syncService = new SyncService(supabase);

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user } = useAuth();
  const [isSynced, setIsSynced] = useState(false);

  // Run sync when user is authenticated
  useEffect(() => {
    if (!user) {
      setIsSynced(false);
      return;
    }

    let unsubscribeRealtime: (() => void) | undefined;

    async function runSync() {
      if (!user) return;
      try {
        await syncService.sync(user.id);
        setIsSynced(true);
      } catch {
        setIsSynced(false);
      }
    }

    // Initial sync
    runSync();

    // Re-sync on network reconnect
    function handleOnline() {
      runSync();
    }
    window.addEventListener('online', handleOnline);

    // Subscribe to Realtime
    unsubscribeRealtime = syncService.subscribe(user.id, () => {
      runSync();
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      unsubscribeRealtime?.();
    };
  }, [user]);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout isSynced={isSynced} />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/inbox" replace />} />
        <Route path="inbox" element={<InboxView />} />
        <Route path="today" element={<TodayView />} />
        <Route path="projects" element={<ProjectsView />} />
      </Route>
      <Route path="/auth" element={<AuthPage />} />
    </Routes>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/main.tsx apps/web/src/App.tsx
git commit -m "feat(web): add App.tsx with React Router, ProtectedRoute, and sync wiring"
```

---

## Task 18: Failing tests for SyncService

**Files:**
- Create: `apps/web/src/__tests__/SyncService.test.ts`

- [ ] **Step 1: Create apps/web/src/__tests__/SyncService.test.ts**

```typescript
// apps/web/src/__tests__/SyncService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { db } from '../lib/db';
import { SyncService } from '../services/SyncService';
import type { Space, Project, Task } from '@sift/shared';

// ── Supabase mock ─────────────────────────────────────────────────────────────

const mockUpsert = vi.fn().mockResolvedValue({ error: null });
const mockSelect = vi.fn().mockResolvedValue({ data: [], error: null });
const mockSubscribe = vi.fn().mockReturnValue({ unsubscribe: vi.fn() });
const mockOn = vi.fn().mockReturnThis();
const mockChannel = vi.fn().mockReturnValue({
  on: mockOn,
  subscribe: mockSubscribe,
});

const mockSupabase = {
  from: vi.fn().mockReturnValue({
    upsert: mockUpsert,
    select: mockSelect,
  }),
  channel: mockChannel,
  removeChannel: vi.fn(),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const now = new Date('2026-04-04T10:00:00Z');

function makeSpace(overrides?: Partial<Space>): Space {
  return {
    id: 'space-1',
    name: 'Work',
    color: '#5E6AD2',
    createdAt: now,
    updatedAt: now,
    synced: false,
    ...overrides,
  };
}

function makeProject(overrides?: Partial<Project>): Project {
  return {
    id: 'project-1',
    name: 'General',
    spaceId: 'space-1',
    createdAt: now,
    updatedAt: now,
    synced: false,
    ...overrides,
  };
}

function makeTask(overrides?: Partial<Task>): Task {
  return {
    id: 'task-1',
    title: 'Test task',
    projectId: 'project-1',
    status: 'inbox',
    workingDate: null,
    dueDate: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    synced: false,
    ...overrides,
  };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(async () => {
  await db.tasks.clear();
  await db.projects.clear();
  await db.spaces.clear();
  vi.clearAllMocks();
  // Reset select to return empty by default
  mockSelect.mockResolvedValue({ data: [], error: null });
  mockUpsert.mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SyncService', () => {
  describe('sync() — push', () => {
    it('pushes unsynced spaces to Supabase', async () => {
      await db.spaces.add(makeSpace({ synced: false }));

      const svc = new SyncService(mockSupabase as any);
      await svc.sync('user-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('spaces');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'space-1', user_id: 'user-1' }),
        ]),
        expect.objectContaining({ onConflict: 'id' })
      );
    });

    it('pushes unsynced projects to Supabase', async () => {
      await db.spaces.add(makeSpace({ synced: true }));
      await db.projects.add(makeProject({ synced: false }));

      const svc = new SyncService(mockSupabase as any);
      await svc.sync('user-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'project-1', user_id: 'user-1' }),
        ]),
        expect.objectContaining({ onConflict: 'id' })
      );
    });

    it('pushes unsynced tasks to Supabase', async () => {
      await db.spaces.add(makeSpace({ synced: true }));
      await db.projects.add(makeProject({ synced: true }));
      await db.tasks.add(makeTask({ synced: false }));

      const svc = new SyncService(mockSupabase as any);
      await svc.sync('user-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'task-1', user_id: 'user-1' }),
        ]),
        expect.objectContaining({ onConflict: 'id' })
      );
    });

    it('does not push records that are already synced', async () => {
      await db.spaces.add(makeSpace({ synced: true }));

      const svc = new SyncService(mockSupabase as any);
      await svc.sync('user-1');

      // upsert should not be called for spaces (no unsynced records)
      const spaceUpsertCalls = mockUpsert.mock.calls.filter(
        (_args, i) => mockSupabase.from.mock.calls[i]?.[0] === 'spaces'
      );
      expect(spaceUpsertCalls).toHaveLength(0);
    });

    it('marks records synced=true after successful push', async () => {
      await db.spaces.add(makeSpace({ synced: false }));

      const svc = new SyncService(mockSupabase as any);
      await svc.sync('user-1');

      const space = await db.spaces.get('space-1');
      expect(space!.synced).toBe(true);
    });
  });

  describe('sync() — pull', () => {
    it('writes remote records to Dexie using LWW', async () => {
      const remoteTask = makeTask({
        id: 'remote-task',
        title: 'From server',
        synced: true,
        updatedAt: new Date('2026-04-04T12:00:00Z'),
      });

      // Simulate select returning a remote task
      mockSelect.mockResolvedValueOnce({ data: [] })   // spaces
        .mockResolvedValueOnce({ data: [] })             // projects
        .mockResolvedValueOnce({                          // tasks
          data: [{
            id: remoteTask.id,
            title: remoteTask.title,
            project_id: remoteTask.projectId,
            status: remoteTask.status,
            working_date: null,
            due_date: null,
            created_at: remoteTask.createdAt.toISOString(),
            updated_at: remoteTask.updatedAt.toISOString(),
            completed_at: null,
            source_url: null,
            synced: true,
            user_id: 'user-1',
          }],
          error: null,
        });

      const svc = new SyncService(mockSupabase as any);
      await svc.sync('user-1');

      const stored = await db.tasks.get('remote-task');
      expect(stored).toBeDefined();
      expect(stored!.title).toBe('From server');
    });

    it('keeps the local record when local updatedAt is newer', async () => {
      const localUpdatedAt = new Date('2026-04-04T13:00:00Z');
      const remoteUpdatedAt = new Date('2026-04-04T11:00:00Z');

      await db.spaces.add(makeSpace({ synced: true }));
      await db.projects.add(makeProject({ synced: true }));
      await db.tasks.add(
        makeTask({ id: 'task-conflict', title: 'Local wins', updatedAt: localUpdatedAt, synced: true })
      );

      mockSelect.mockResolvedValue({
        data: [{
          id: 'task-conflict',
          title: 'Remote title',
          project_id: 'project-1',
          status: 'inbox',
          working_date: null,
          due_date: null,
          created_at: now.toISOString(),
          updated_at: remoteUpdatedAt.toISOString(),
          completed_at: null,
          source_url: null,
          synced: true,
          user_id: 'user-1',
        }],
        error: null,
      });

      const svc = new SyncService(mockSupabase as any);
      await svc.sync('user-1');

      const stored = await db.tasks.get('task-conflict');
      expect(stored!.title).toBe('Local wins');
    });
  });

  describe('subscribe()', () => {
    it('returns an unsubscribe function', () => {
      const svc = new SyncService(mockSupabase as any);
      const unsub = svc.subscribe('user-1', vi.fn());
      expect(typeof unsub).toBe('function');
    });

    it('calls the onChange callback when Realtime fires', () => {
      const onChange = vi.fn();
      const svc = new SyncService(mockSupabase as any);

      // Capture the handler passed to .on()
      let capturedHandler: (() => void) | undefined;
      mockOn.mockImplementation((_event: string, _filter: unknown, handler: () => void) => {
        capturedHandler = handler;
        return { on: mockOn, subscribe: mockSubscribe };
      });

      svc.subscribe('user-1', onChange);
      expect(capturedHandler).toBeDefined();
      capturedHandler!();
      expect(onChange).toHaveBeenCalledOnce();
    });
  });
});
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
cd apps/web && npm test -- --reporter=verbose 2>&1 | grep -E '(PASS|FAIL|Cannot find)'
```

Expected: tests fail with `Cannot find module '../services/SyncService'`.

- [ ] **Step 3: Commit failing tests**

```bash
git add apps/web/src/__tests__/SyncService.test.ts
git commit -m "test(web): add failing tests for SyncService"
```

---

## Task 19: Implement SyncService

**Files:**
- Create: `apps/web/src/services/SyncService.ts`

- [ ] **Step 1: Create apps/web/src/services/SyncService.ts**

```typescript
// apps/web/src/services/SyncService.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { db } from '../lib/db';
import type { Space, Project, Task } from '@sift/shared';

const LAST_SYNC_KEY = 'speedy_last_synced_at';

function getLastSyncedAt(): Date {
  const stored = localStorage.getItem(LAST_SYNC_KEY);
  return stored ? new Date(stored) : new Date(0);
}

function setLastSyncedAt(date: Date): void {
  localStorage.setItem(LAST_SYNC_KEY, date.toISOString());
}

// ── Row mappers ───────────────────────────────────────────────────────────────

function spaceToRow(space: Space, userId: string) {
  return {
    id: space.id,
    user_id: userId,
    name: space.name,
    color: space.color,
    created_at: space.createdAt.toISOString(),
    updated_at: space.updatedAt.toISOString(),
    synced: true,
  };
}

function rowToSpace(row: Record<string, unknown>): Space {
  return {
    id: row.id as string,
    name: row.name as string,
    color: row.color as string,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    synced: true,
  };
}

function projectToRow(project: Project, userId: string) {
  return {
    id: project.id,
    user_id: userId,
    name: project.name,
    space_id: project.spaceId,
    created_at: project.createdAt.toISOString(),
    updated_at: project.updatedAt.toISOString(),
    synced: true,
  };
}

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    spaceId: row.space_id as string,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    synced: true,
  };
}

function taskToRow(task: Task, userId: string) {
  return {
    id: task.id,
    user_id: userId,
    title: task.title,
    project_id: task.projectId,
    status: task.status,
    working_date: task.workingDate?.toISOString() ?? null,
    due_date: task.dueDate?.toISOString() ?? null,
    created_at: task.createdAt.toISOString(),
    updated_at: task.updatedAt.toISOString(),
    completed_at: task.completedAt?.toISOString() ?? null,
    source_url: task.sourceUrl ?? null,
    synced: true,
  };
}

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    projectId: row.project_id as string,
    status: row.status as Task['status'],
    workingDate: row.working_date ? new Date(row.working_date as string) : null,
    dueDate: row.due_date ? new Date(row.due_date as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    completedAt: row.completed_at ? new Date(row.completed_at as string) : null,
    sourceUrl: (row.source_url as string | undefined) ?? undefined,
    synced: true,
  };
}

// ── SyncService ───────────────────────────────────────────────────────────────

export class SyncService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async sync(userId: string): Promise<void> {
    const syncStartedAt = new Date();
    const lastSyncedAt = getLastSyncedAt();

    await this.syncSpaces(userId, lastSyncedAt);
    await this.syncProjects(userId, lastSyncedAt);
    await this.syncTasks(userId, lastSyncedAt);

    setLastSyncedAt(syncStartedAt);
  }

  private async syncSpaces(userId: string, lastSyncedAt: Date): Promise<void> {
    // Push
    const unsynced = await db.spaces.where('synced').equals(0).toArray();
    if (unsynced.length > 0) {
      const { error } = await this.supabase
        .from('spaces')
        .upsert(unsynced.map((s) => spaceToRow(s, userId)), { onConflict: 'id' });
      if (!error) {
        await db.spaces.where('synced').equals(0).modify({ synced: true });
      }
    }

    // Pull
    const { data, error: pullError } = await this.supabase
      .from('spaces')
      .select('*')
      .gt('updated_at', lastSyncedAt.toISOString());

    if (pullError || !data) return;

    for (const row of data as Record<string, unknown>[]) {
      const remote = rowToSpace(row);
      const local = await db.spaces.get(remote.id);
      if (!local || remote.updatedAt > local.updatedAt) {
        await db.spaces.put(remote);
      }
    }
  }

  private async syncProjects(userId: string, lastSyncedAt: Date): Promise<void> {
    // Push
    const unsynced = await db.projects.where('synced').equals(0).toArray();
    if (unsynced.length > 0) {
      const { error } = await this.supabase
        .from('projects')
        .upsert(unsynced.map((p) => projectToRow(p, userId)), { onConflict: 'id' });
      if (!error) {
        await db.projects.where('synced').equals(0).modify({ synced: true });
      }
    }

    // Pull
    const { data, error: pullError } = await this.supabase
      .from('projects')
      .select('*')
      .gt('updated_at', lastSyncedAt.toISOString());

    if (pullError || !data) return;

    for (const row of data as Record<string, unknown>[]) {
      const remote = rowToProject(row);
      const local = await db.projects.get(remote.id);
      if (!local || remote.updatedAt > local.updatedAt) {
        await db.projects.put(remote);
      }
    }
  }

  private async syncTasks(userId: string, lastSyncedAt: Date): Promise<void> {
    // Push
    const unsynced = await db.tasks.where('synced').equals(0).toArray();
    if (unsynced.length > 0) {
      const { error } = await this.supabase
        .from('tasks')
        .upsert(unsynced.map((t) => taskToRow(t, userId)), { onConflict: 'id' });
      if (!error) {
        await db.tasks.where('synced').equals(0).modify({ synced: true });
      }
    }

    // Pull
    const { data, error: pullError } = await this.supabase
      .from('tasks')
      .select('*')
      .gt('updated_at', lastSyncedAt.toISOString());

    if (pullError || !data) return;

    for (const row of data as Record<string, unknown>[]) {
      const remote = rowToTask(row);
      const local = await db.tasks.get(remote.id);
      if (!local || remote.updatedAt > local.updatedAt) {
        await db.tasks.put(remote);
      }
    }
  }

  /**
   * Subscribe to Supabase Realtime for the tasks table.
   * Calls onChange whenever a remote change arrives.
   * Returns an unsubscribe function.
   */
  subscribe(userId: string, onChange: () => void): () => void {
    const channelName = `tasks:user:${userId}`;
    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
        onChange
      )
      .subscribe();

    return () => {
      this.supabase.removeChannel(channel);
    };
  }
}
```

- [ ] **Step 2: Run tests and confirm they pass**

```bash
cd apps/web && npm test -- --reporter=verbose 2>&1 | grep -E '(✓|×|PASS|FAIL)'
```

Expected: all `SyncService.test.ts` tests pass. All previous test suites still pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/services/SyncService.ts
git commit -m "feat(web): implement SyncService with LWW push/pull and Realtime subscribe"
```

---

## Task 20: Wire sync into App + verify full test suite

- [ ] **Step 1: Confirm App.tsx already wires sync correctly**

The App.tsx written in Task 17 already:
- Calls `syncService.sync(user.id)` on mount when authenticated
- Re-runs sync on `window 'online'` event
- Calls `syncService.subscribe(user.id, callback)` for Realtime and cleans up on unmount

Verify the wiring in `apps/web/src/App.tsx`:

```bash
grep -n "syncService\|addEventListener\|subscribe" apps/web/src/App.tsx
```

Expected output includes lines referencing `syncService.sync`, `syncService.subscribe`, and `window.addEventListener('online'`.

- [ ] **Step 2: Run full test suite**

```bash
cd apps/web && npm test -- --reporter=verbose 2>&1
```

Expected: all test files pass with 0 failures.

```
 PASS  src/__tests__/useTasks.test.ts
 PASS  src/__tests__/useKeyboardNav.test.ts
 PASS  src/__tests__/TaskRow.test.tsx
 PASS  src/__tests__/SyncService.test.ts

Test Files  4 passed (4)
Tests      XX passed (XX)
```

- [ ] **Step 3: Commit**

```bash
git add -p   # confirm nothing unintended is staged
git commit -m "test(web): verify full test suite passes after sync wiring"
```

---

## Task 21: vercel.json + .env.example + final bootstrap

**Files:**
- Create: `apps/web/vercel.json`

- [ ] **Step 1: Create apps/web/vercel.json**

```json
{
  "buildCommand": "cd ../.. && npm run build --filter=web",
  "outputDirectory": "apps/web/dist",
  "installCommand": "npm install",
  "framework": null,
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

The `rewrites` rule ensures React Router's client-side routing works correctly on Vercel — all paths serve `index.html`.

- [ ] **Step 2: Confirm .env.example is complete**

The file created in Task 3 already documents both required variables. Verify:

```bash
cat apps/web/.env.example
```

Expected:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

- [ ] **Step 3: Verify Vite build succeeds (dry run)**

```bash
cd apps/web && npm run build 2>&1 | tail -10
```

Expected: `dist/index.html` produced, no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/vercel.json
git commit -m "chore(web): add vercel.json with SPA rewrite rule for React Router"
```

---

## Summary

After completing all 21 tasks, `apps/web` will be a fully functional Vite + React + Tailwind web app with:

| Capability | Implementation |
|---|---|
| Auth | Supabase Google OAuth + magic link via `AuthContext` |
| Local-first storage | Dexie via `@sift/shared`, reactive via `useLiveQuery` |
| Views | Inbox, Today, Projects — each keyboard-navigable |
| Keyboard shortcuts | `j`/`k` focus, `Enter` toggle done, `Backspace` archive |
| Cloud sync | LWW SyncService: push unsynced, pull remote, Realtime sub |
| Design | Tailwind v3 with dark design tokens matching spec |
| Tests | TDD for all hooks and SyncService; component tests for TaskRow |
| Deployment | `vercel.json` with SPA rewrite, env vars documented |
