# Phase 0 — Scaffolding & Foundations (agent task plan)

**Goal:** a running Tauri app with the architecture skeleton, the typed IPC
pipeline, SQLite, and CI. After this phase, one command round-trips with
generated types and CI is green.

Routing/parallel rules: see [`../11-agent-automation-guide.md`](../11-agent-automation-guide.md).
Roadmap context: [`../09-implementation-roadmap.md`](../09-implementation-roadmap.md) Phase 0.

## Wave plan

```
Wave 1 (sequential-ish foundation):
  P0-T1 scaffold ──▶ P0-T2 capabilities/CSP, P0-T3 sqlx+AppState, P0-T6 frontend setup
Wave 2 (parallel, depend on T1+relevant):
  P0-T4 IPC+bindings pipeline, P0-T5 CI, P0-T7 tokens stub
Sync: P0-S integration
```

---

### P0-T1 — Scaffold Tauri 2 app into repo layout
- Model: **Tier A — Sonnet 4.6**
- Lane: RUST-CORE + UI-SHARED (foundational; runs alone in Wave 1)
- Owns (files): repo root config, `src-tauri/**` skeleton, `src/**` skeleton, `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`
- Depends on: none
- Parallel with: none (it creates the tree)
- Context to read: `docs/03-project-structure.md`, `docs/02-tech-stack.md`
- Prompt: "Scaffold a Tauri 2 app (`npm create tauri-app` react-ts template) and
  reorganize it to EXACTLY match the tree in docs/03-project-structure.md
  (`src/app`, `src/features`, `src/components`, `src/lib`, `src/styles`;
  `src-tauri/src/{commands,core,providers,store,mcp,harness}` with empty `mod.rs`
  stubs; `src-tauri/migrations/`, `src-tauri/capabilities/`). Add the `@/` import
  alias. Ensure `npm run tauri dev` opens a blank window. Do NOT implement
  features — just the skeleton + a placeholder screen."
- Definition of done: `npm run tauri dev` builds and opens a window; directory
  tree matches the doc; `cargo build` and `npm run build` succeed.

### P0-T2 — Lock down capabilities + CSP
- Model: **Tier S — Opus 4.8** (security-critical, sets the pattern)
- Lane: RUST-CORE (`src-tauri/tauri.conf.json`, `src-tauri/capabilities/**`)
- Owns (files): `src-tauri/tauri.conf.json`, `src-tauri/capabilities/*`
- Depends on: P0-T1
- Parallel with: P0-T3, P0-T6
- Context to read: `docs/06-security-guardrails.md` §1, `docs/01-architecture.md`
- Prompt: "Configure Tauri capabilities and CSP per docs/06-security-guardrails.md
  §1: expose NO fs/shell/http plugins to JS; strict CSP (no remote scripts, no
  eval, no inline handlers; only bundled assets + ipc/asset schemes). External
  links open in the system browser. Document each allowed capability with a
  one-line rationale comment."
- Definition of done: app still runs; no `fs`/`shell`/`http` JS APIs reachable
  (add a tiny test/assertion); CSP present and strict.

### P0-T3 — SQLite (sqlx) + AppState + first migration
- Model: **Tier A — Sonnet 4.6**
- Lane: RUST-CORE + MIGRATION (`src-tauri/src/{state.rs,store/**}`, `migrations/0001_*`)
- Owns (files): `src-tauri/src/state.rs`, `src-tauri/src/store/**`, `src-tauri/migrations/0001_init.sql`, `src-tauri/src/error.rs`
- Depends on: P0-T1
- Parallel with: P0-T2, P0-T6
- Context to read: `docs/04-data-model.md`, `docs/01-architecture.md` (persistence)
- Prompt: "Add `sqlx` (sqlite, tokio) and create `AppState` holding the DB pool
  plus empty child-process/stream registries. Add migration `0001_init.sql`
  creating the `workspace`, `account`, and `project` tables from
  docs/04-data-model.md (only these three this phase). Run `sqlx::migrate!` at
  startup inside a transaction; fail startup loudly on error. Add `AppError`
  (thiserror) that serializes to the shape in docs/05-ipc-contract.md."
- Definition of done: app creates `app.db` under XDG data dir on first run;
  migration applies; a Rust unit test inserts/queries a workspace.

### P0-T4 — IPC wrapper + ts-rs bindings pipeline
- Model: **Tier S — Opus 4.8** (owns the contract mechanism, ADR-0007)
- Lane: RUST-CMD + UI-SHARED (`src-tauri/src/commands/`, `src/lib/ipc.ts`, generated `bindings.ts`)
- Owns (files): `src-tauri/src/commands/mod.rs`, `src-tauri/build.rs` (or export test), `src/lib/ipc.ts`, `src/lib/bindings.ts`
- Depends on: P0-T1, P0-T3
- Parallel with: P0-T5, P0-T7
- Context to read: `docs/05-ipc-contract.md`, ADR-0007
- Prompt: "Wire ts-rs binding generation: cross-boundary structs derive
  serde+TS; a `cargo test export_bindings` writes `src/lib/bindings.ts`. Add a
  thin typed `src/lib/ipc.ts` wrapping Tauri `invoke`/`listen` with the AppError
  shape. Implement ONE end-to-end command (`app_health() -> {version, db_ok}`)
  with its generated type, called from the placeholder screen to prove the pipe."
- Definition of done: `cargo test export_bindings` produces committed
  `bindings.ts`; the UI calls `app_health` and renders the result; a CI-style
  `git diff --exit-code` on bindings passes.

### P0-T5 — CI pipeline skeleton
- Model: **Tier B — Gemini 3.5 Flash**
- Lane: DOCS/CI (`.github/workflows/**`, `scripts/**`)
- Owns (files): `.github/workflows/ci.yml`, `scripts/*`
- Depends on: P0-T1 (needs scripts to exist; can stub jobs that later fill in)
- Parallel with: P0-T4, P0-T7
- Context to read: `docs/08-ci-cd.md`
- Prompt: "Create the GitHub Actions CI from docs/08-ci-cd.md: jobs for
  lint-and-typecheck, rust-checks (fmt/clippy -D warnings), bindings-drift,
  test-rust, test-frontend, build-app. Install the Linux system deps listed in
  README.md. Cache cargo+npm. Jobs that have no targets yet should run their
  command and pass (no-op tolerant), not be omitted. Add a perf-smoke job stub
  that records a baseline."
- Definition of done: CI runs green on the scaffold; clippy is `-D warnings`;
  bindings-drift job present.

### P0-T6 — Frontend setup (Vite/Tailwind/router shell)
- Model: **Tier B — Grok**
- Lane: UI-SHARED + UI app shell (`src/app/**`, `src/styles/globals.css`, `tailwind.config.ts`)
- Owns (files): `src/app/**`, `tailwind.config.ts`, `src/styles/globals.css`, `src/main.tsx`
- Depends on: P0-T1
- Parallel with: P0-T2, P0-T3
- Context to read: `docs/10-ui-ux-layout.md`, `docs/03-project-structure.md`
- Prompt: "Set up Tailwind + the window shell from docs/10-ui-ux-layout.md as
  empty placeholders: titlebar, left sidebar, main area, right side-panel dock,
  status bar — all non-functional layout only, using design tokens (consume
  `src/styles/tokens.css`, do not define tokens here). Add Zustand + TanStack
  Query providers and in-app routing stubs. No feature logic."
- Definition of done: the shell layout renders at the right proportions; lint/
  typecheck pass; no hardcoded colors (tokens only).

### P0-T7 — Design tokens stub
- Model: **Tier C — DeepSeek v4 Flash** (free; minimal, trivial)
- Lane: UI-SHARED (`src/styles/tokens.css` only)
- Owns (files): `src/styles/tokens.css`
- Depends on: P0-T1
- Parallel with: P0-T4, P0-T5, P0-T6
- Context to read: `docs/10-ui-ux-layout.md` (Theming/tokens section)
- Prompt: "Create `src/styles/tokens.css` defining `--cdx-*` CSS custom
  properties for color (light+dark via a `[data-theme]` selector), spacing,
  radius, font families, and shadow — placeholder values are fine; structure and
  naming matter. No component styles, just tokens."
- Definition of done: file defines the documented token groups for light+dark;
  imported by `globals.css`; no other files touched.

---

## Phase 0 sync step (P0-S)
- Model: **Tier S — Opus 4.8** (Integrator)
- Merge order: T1 → T2/T3/T6 → T4/T5/T7. Resolve conflicts; run full CI; confirm
  `app_health` round-trips and perf-smoke baseline is recorded. Tag pre-M1.
- Exit criteria (from roadmap): window opens; one command round-trips with
  generated types; CI green; perf baseline recorded.
