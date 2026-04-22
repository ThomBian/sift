# anatomy.md

> Auto-maintained by OpenWolf. Last scanned: 2026-04-22T20:23:27.611Z
> Files: 191 tracked | Anatomy hits: 0 | Misses: 0

## ./

- `.eslintrc.js` — ESLint configuration (~311 tok)
- `.gitignore` — Git ignore rules (~31 tok)
- `.impeccable.md` — Sift — Design Standard (~4269 tok)
- `.prettierrc` — Prettier configuration (~34 tok)
- `CLAUDE.md` — OpenWolf (~1800 tok)
- `GEMINI.md` — CLAUDE.md (~1736 tok)
- `package-lock.json` — npm lock file (~139904 tok)
- `package.json` — Node.js package manifest (~221 tok)
- `README.md` — Project documentation (~189 tok)
- `skills-lock.json` (~65 tok)
- `tsconfig.base.json` (~100 tok)
- `turbo.json` — Turborepo configuration (~68 tok)
- `vercel.json` (~59 tok)

## .agents/skills/emil-design-eng/

- `SKILL.md` — Design Engineering (~7046 tok)

## .claude/

- `settings.json` (~441 tok)
- `settings.local.json` (~433 tok)

## .claude/commands/

- `commit.md` — Context (~193 tok)
- `doc-refactor.md` — Documentation Refactor (~319 tok)
- `generate-api-docs.md` — API Documentation Generator (~121 tok)
- `optimize.md` — Code Optimization (~170 tok)
- `pr.md` — Pull Request Preparation Checklist (~191 tok)
- `push-all.md` — Commit and Push Everything (~1006 tok)
- `README.md` — Project documentation (~5906 tok)
- `setup-ci-cd.md` — Setup CI/CD Pipeline (~256 tok)
- `unit-test-expand.md` — Expand Unit Tests (~249 tok)

## .claude/rules/

- `openwolf.md` (~313 tok)

## .github/workflows/

- `supabase-migrations.yml` — Applies `supabase/migrations/*` to the linked production database. (~378 tok)

## .superpowers/brainstorm/2527-1775510497/content/

- `edit-approaches.html` (~3635 tok)
- `full-width-edit.html` (~3288 tok)

## .superpowers/brainstorm/2527-1775510497/state/

- `server-stopped` (~14 tok)
- `server.log` (~557 tok)
- `server.pid` (~2 tok)

## .superpowers/brainstorm/4826-1775289285/content/

- `backend.html` (~311 tok)
- `extension-overlay.html` — Extension — Capture Overlay Mockup (~2372 tok)
- `hosting.html` (~329 tok)
- `scope.html` (~320 tok)
- `smart-input-v2.html` — Smart Input v2 — Inline chips (~3307 tok)
- `smart-input.html` — Smart Input — Flow Mockup (~2683 tok)
- `spaces-views.html` — Spaces — View scope (~2008 tok)
- `stores.html` (~302 tok)
- `styling.html` (~320 tok)
- `sync.html` (~245 tok)
- `waiting-2.html` (~39 tok)
- `waiting.html` (~39 tok)
- `webapp-layout-v2.html` — Speedy — Dashboard (~3872 tok)
- `webapp-layout.html` — Browser-Tasker — Dashboard Mockup (~2667 tok)

## .superpowers/brainstorm/4826-1775289285/state/

- `server-stopped` (~14 tok)
- `server.log` (~907 tok)
- `server.pid` (~2 tok)

## .superpowers/brainstorm/80278-1775544731/content/

- `new-project-ui.html` (~900 tok)
- `open-behavior.html` (~1188 tok)
- `waiting-1.html` (~38 tok)

## .superpowers/brainstorm/80278-1775544731/state/

- `server-stopped` (~14 tok)
- `server.log` (~403 tok)
- `server.pid` (~2 tok)

## .superpowers/brainstorm/84073-1775634208/content/

- `approaches.html` (~884 tok)
- `taskrow-mockup.html` (~1406 tok)

## .superpowers/brainstorm/84073-1775634208/state/

- `server-stopped` (~14 tok)
- `server.log` (~166 tok)
- `server.pid` (~2 tok)

## .superpowers/brainstorm/85613-1776844759/content/

- `grid-layout.html` (~2522 tok)
- `mode-toggle.html` (~923 tok)
- `today-column.html` (~1340 tok)
- `waiting.html` (~39 tok)

## .superpowers/brainstorm/85613-1776844759/state/

- `server-stopped` (~14 tok)
- `server.log` (~466 tok)
- `server.pid` (~2 tok)

## .superset/

- `config.json` (~17 tok)

## apps/web/

- `index.html` — Sift (~187 tok)
- `package.json` — Node.js package manifest (~447 tok)
- `postcss.config.js` — PostCSS configuration (~18 tok)
- `tailwind.config.ts` — Tailwind CSS configuration (~963 tok)
- `tsconfig.json` — TypeScript configuration (~139 tok)
- `vercel.json` (~60 tok)
- `vite.config.ts` — Vite build configuration (~277 tok)

## apps/web/src/

- `App.tsx` — App (~362 tok)
- `index.css` — Styles: 8 rules, 2 media queries (~542 tok)
- `main.tsx` (~123 tok)
- `vite-env.d.ts` — / <reference types="vite/client" /> (~11 tok)

## apps/web/src/__tests__/

- `HintBar.test.tsx` — / <reference types="vitest" /> (~1064 tok)
- `setup.ts` (~81 tok)
- `SyncService.test.ts` — @vitest-environment jsdom (~4982 tok)
- `TaskRow.test.tsx` — @vitest-environment jsdom (~1808 tok)
- `Topbar.test.tsx` — / <reference types="vitest" /> (~754 tok)
- `useKeyboardNav.test.ts` — @vitest-environment jsdom (~2123 tok)
- `useProjectNav.test.ts` — @vitest-environment jsdom (~2252 tok)
- `useSync.test.ts` — / <reference types="vitest" /> (~1172 tok)
- `useTasks.test.ts` — @vitest-environment jsdom (~3234 tok)
- `useWeekTasks.test.ts` — @vitest-environment jsdom (~2318 tok)

## apps/web/src/components/

- `CommandPalette.tsx` — createTask — uses useState, useMemo, useCallback, useEffect (~1406 tok)
- `ConfirmModal.tsx` — EXIT_MS — uses useState, useRef, useCallback, useEffect (~1576 tok)
- `InputBar.tsx` — handleTaskReady — uses useMemo (~550 tok)
- `ProjectEditPalette.tsx` — formatDate — uses useState, useCallback, useEffect (~3156 tok)
- `TaskList.tsx` — Shown when a task has no project or the project row is missing (e.g. sync race). (~1367 tok)
- `TaskRow.tsx` — Narrow columns: title on first line, project + due stacked with truncation. (~2367 tok)

## apps/web/src/components/layout/

- `AppLayout.tsx` — VIEWS — uses useState, useNavigate, useEffect (~2038 tok)
- `HintBar.tsx` — NONE_HINTS (~911 tok)
- `Sidebar.tsx` — focusWeekHeaderSoon (~2002 tok)
- `Topbar.tsx` — SYNC_LABEL — uses useNavigate, useEffect (~1958 tok)

## apps/web/src/components/week/

- `DayColumn.tsx` — TaskItem (~1046 tok)
- `WeekGrid.tsx` — WeekGrid (~278 tok)
- `WeekTopBar.tsx` — MODE_OPTIONS (~1053 tok)

## apps/web/src/contexts/

- `AuthContext.tsx` — False until the first getSession finishes so OAuth hash is not stripped by a child <Navigate> first. (~736 tok)

## apps/web/src/hooks/

- `useKeyboardNav.ts` — Exports UseKeyboardNavReturn, useKeyboardNav (~1133 tok)
- `useProjectNav.ts` — Ids in focus/DOM order: active projects, then `SHOW_ARCHIVED_TOGGLE_ID` when shown, (~658 tok)
- `useSpacesProjects.ts` — False until the first Dexie live query resolves; avoids TaskList mapping tasks before projects exist in memory. (~319 tok)
- `useSync.ts` — Exports SyncStatus, useSync (~947 tok)
- `useTasks.ts` — YYYY-MM-DD in local time — bumps when the calendar day changes (for live-query deps). (~2128 tok)
- `useTrackedTimeouts.ts` — Schedules timeouts that are cleared on unmount (avoids setState after teardown). (~168 tok)
- `useWeekTasks.ts` — Calendar column for this task in the given week mode (local day in week, or null). (~1260 tok)

## apps/web/src/lib/

- `createProjectForTask.ts` — Returns project id for the task, creating a project first when `newProjectName` is set. (~291 tok)
- `db.ts` (~14 tok)
- `requestSync.ts` — Registered from App when the user is signed in and Supabase is configured. (~110 tok)
- `supabase.ts` — Null when env vars are missing — app stays local-first without throwing at import. (~155 tok)
- `syncDeletionOutbox.ts` — Replace any prior entry for the same project, then append (idempotent re-enqueue). (~757 tok)

## apps/web/src/pages/

- `AuthPage.tsx` — AuthPage — renders form — uses useState (~1666 tok)

## apps/web/src/services/

- `SyncService.ts` — Exports SyncService (~3017 tok)

## apps/web/src/views/

- `InboxView.tsx` — dispatchEditTask — uses useState, useCallback, useEffect (~1189 tok)
- `ProjectsView.tsx` — ProgressBar (~7463 tok)
- `TodayView.tsx` — dispatchEditTask — uses useState, useCallback, useEffect (~1182 tok)
- `WeekView.tsx` — Enter toggles done moves the row in the DOM; restore focus so keyboard nav keeps working. (~4036 tok)

## docs/

- `product-concept.md` — Product Concept: Browser-Tasker (Universal Chromium Edition) (~1286 tok)
- `STRATEGY.md` — Product Strategy & Value Proposition (~265 tok)
- `VISION.md` — Vision Narrative: The Sifted World (~585 tok)

## docs/superpowers/plans/

- `2026-04-04-plan-1-foundation.md` — Speedy Tasks — Plan 1: Monorepo Foundation & Shared Package (~10653 tok)
- `2026-04-04-plan-2-web-app.md` — Web App Implementation Plan (~23447 tok)
- `2026-04-04-plan-3-extension.md` — Chrome Extension Implementation Plan (~13587 tok)
- `2026-04-06-task-edit-panel.md` — Task Edit Panel Implementation Plan (~10008 tok)
- `2026-04-07-projects-view-keyboard-nav.md` — Projects View Keyboard Navigation Implementation Plan (~11621 tok)
- `2026-04-08-project-emoji.md` — Project Emoji Implementation Plan (~9272 tok)
- `2026-04-09-external-links.md` — External Links for Tasks and Projects — Implementation Plan (~10824 tok)
- `2026-04-10-date-picker-implementation.md` — Date Picker Implementation Plan (~2208 tok)
- `2026-04-10-pass-task-counts.md` — Pass Task Counts from App Implementation Plan (~919 tok)
- `2026-04-13-auth-gate-sync-indicator.md` — Auth Gate + Sync Indicator Implementation Plan (~3998 tok)
- `2026-04-13-cloud-bootstrap-sync.md` — Cloud Bootstrap Sync Implementation Plan (~6316 tok)
- `2026-04-13-supabase-auth-prod.md` — Supabase sign-in + production sync — implementation plan (~3656 tok)
- `2026-04-22-week-overview.md` — Week Overview Implementation Plan (~8156 tok)

## docs/superpowers/specs/

- `2026-04-04-speedy-tasks-design.md` — Speedy Tasks — Design Spec (~3222 tok)
- `2026-04-06-task-edit-panel-design.md` — Task Edit Panel Design (~1051 tok)
- `2026-04-07-projects-view-keyboard-nav-design.md` — Projects View — Keyboard Navigation & Project Management (~1946 tok)
- `2026-04-08-project-emoji-design.md` — Project Emoji — Design Spec (~1901 tok)
- `2026-04-09-external-links-design.md` — External Links for Tasks and Projects (~673 tok)
- `2026-04-09-project-archive-design.md` — Project Archive — Design Spec (~1458 tok)
- `2026-04-10-date-picker-design.md` — Spec: Date Picker with Calendar & Task Counts (~800 tok)
- `2026-04-13-auth-gate-sync-indicator-design.md` — Auth Gate + Sync Indicator (~612 tok)
- `2026-04-13-cloud-bootstrap-sync-design.md` — Cloud Bootstrap Sync Design (~1408 tok)
- `2026-04-22-week-overview-design.md` — Week overview — design spec (~2100 tok)

## packages/shared/

- `package.json` — Node.js package manifest (~469 tok)
- `tsconfig.json` — TypeScript configuration (~40 tok)
- `vite.config.ts` — Vite build configuration (~176 tok)

## packages/shared/src/

- `db.ts` — Wipes all local IndexedDB data. Call before bootstrap when user identity changes. (~1382 tok)
- `design-tokens.css` — Styles: 32 vars (~502 tok)
- `emojiPool.ts` — Exports EmojiCategory, EMOJI_POOL, ALL_EMOJIS, getRandomEmoji, searchEmojis (~990 tok)
- `index.ts` (~255 tok)
- `parseLooseDate.ts` — Detects an explicit calendar year in typed date strings (4-digit year, or m/d/y with a year segment). (~534 tok)
- `types.ts` — null = unassigned (inbox/today only until user picks a project) (~310 tok)
- `vite-env.d.ts` — / <reference types="vite/client" /> (~11 tok)

## packages/shared/src/Calendar/

- `Calendar.module.css` — Styles: 23 rules, 17 vars, 1 media queries (~1518 tok)
- `Calendar.tsx` — Visual-only “cursor” day when nothing is selected (e.g. today in SmartInput). Not a committed selection. (~522 tok)

## packages/shared/src/EmojiPicker/

- `EmojiPicker.module.css` — Styles: 7 rules (~294 tok)
- `EmojiPicker.tsx` — EmojiPicker — uses useState, useMemo, useEffect, useRef (~1473 tok)
- `gridNav.ts` — 8-column row-major grid per section (matches each category sub-grid in EmojiPicker). (~1036 tok)

## packages/shared/src/SmartInput/

- `Dropdown.module.css` — Styles: 17 rules, 1 media queries, 2 animations (~932 tok)
- `Dropdown.tsx` — Due / working date picker only. (~2998 tok)
- `SmartInput.module.css` — Styles: 37 rules, 1 media queries, 3 animations (~1451 tok)
- `SmartInput.tsx` — Optional external ref to the underlying <input> for programmatic focus from the parent. (~2956 tok)
- `useSmartInput.ts` — Filter text while project / date chip is active (shared field, cleared on chip change). (~3495 tok)

## packages/shared/src/__tests__/

- `Calendar.test.tsx` — onSelect (~469 tok)
- `db.test.ts` — packages/shared/src/__tests__/db.test.ts (~544 tok)
- `DropdownNavigation.test.tsx` — packages/shared/src/__tests__/DropdownNavigation.test.tsx (~1092 tok)
- `EmojiPicker.test.tsx` — onSelect (~726 tok)
- `emojiPool.test.ts` — Declares cat (~376 tok)
- `gridNav.test.ts` — Declares workThenCreative (~376 tok)
- `parseLooseDate.test.ts` — Declares ref (~791 tok)
- `setup.ts` (~65 tok)
- `SmartInput.test.tsx` — packages/shared/src/__tests__/SmartInput.test.tsx (~1772 tok)
- `useSmartInput.test.ts` — packages/shared/src/__tests__/useSmartInput.test.ts (~3083 tok)

## supabase/

- `.gitignore` — Git ignore rules (~20 tok)
- `config.toml` — For detailed configuration reference documentation, visit: (~4228 tok)

## supabase/.temp/

- `cli-latest` (~2 tok)
- `gotrue-version` (~3 tok)
- `linked-project.json` (~39 tok)
- `pooler-url` (~25 tok)
- `postgres-version` (~3 tok)
- `project-ref` (~6 tok)
- `rest-version` (~2 tok)
- `storage-migration` (~6 tok)
- `storage-version` (~3 tok)

## supabase/migrations/

- `20260413000000_init_sync.sql` — Sift / Speedy Tasks — tables for SyncService (push/pull + tasks Realtime) (~1189 tok)
- `20260413140000_tasks_project_nullable.sql` — Allow tasks without a project (local-first inbox capture before @p). (~39 tok)
- `20260416120000_delete_policies.sql` — Allow authenticated users to delete their own rows (project delete sync + future space/task deletes) (~164 tok)
