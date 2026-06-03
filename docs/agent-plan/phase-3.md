# Phase 3 — Terminal, Worktrees, Side Panel (agent task plan)

**Goal:** integrated terminals, git worktrees at the required path, and the side
panel with terminal + review-changes surfaces.

Specs: [`terminal.md`](../specs/terminal.md), [`worktrees.md`](../specs/worktrees.md),
[`side-panel.md`](../specs/side-panel.md).
Routing rules: [`../11-agent-automation-guide.md`](../11-agent-automation-guide.md).

## Wave plan

```
Wave 1: P3-T1 migration(worktree)  ─ MIGRATION
Wave 2 (core, parallel): P3-T2 PTY backend(A)  P3-T3 worktree+git(S)
Wave 3 (parallel): P3-T4 review-diff core(A)  P3-T5 terminal UI(B)
Wave 4: P3-T6 side-panel shell(A)  P3-T7 diff viewer UI(A)  P3-T8 tab component(C)
Sync: P3-S
```

---

### P3-T1 — Worktree schema migration
- Model: **Tier A — Sonnet 4.6** · Lane: MIGRATION
- Owns: `migrations/0004_*.sql`, `worktree` model
- Depends on: Phase 2 · Parallel with: none
- Context: `docs/04-data-model.md`
- Prompt: "Add migration `0004` for the `worktree` table per docs/04-data-model.md
  (incl. `created_by`). Add the model struct (serde+TS)."
- DoD: applies; model compiles; bindings regenerate.

### P3-T2 — PTY backend + commands
- Model: **Tier A — Sonnet 4.6**
- Lane: RUST-CORE + RUST-CMD (`core/pty.rs`, `commands/pty.rs`)
- Owns: `src-tauri/src/core/pty.rs`, `src-tauri/src/commands/pty.rs`
- Depends on: Phase 0 (process registry in AppState) · Parallel with: P3-T3
- Context: `docs/specs/terminal.md`, `docs/06-security-guardrails.md`
- Prompt: "Implement PTYs with portable-pty per spec: `pty_open/write/resize/close`
  streaming `pty:{id}:data` and `:exit`. Register every PTY in AppState's process
  registry; kill all on window/workspace close (graceful SIGTERM→SIGKILL).
  Backpressure on high-throughput output. Integration tests: open→echo→assert
  output→close→assert reaped; concurrent PTYs isolated."
- DoD: full TTY behavior; no orphans; concurrency isolated; tests pass.

### P3-T3 — Worktree manager + git adapter
- Model: **Tier S — Opus 4.8** (exact path convention + git correctness; agents
  depend on this)
- Lane: RUST-CORE + RUST-CMD (`core/worktree.rs`, `core/git.rs`, `commands/worktree.rs`)
- Owns: `src-tauri/src/core/worktree.rs`, `src-tauri/src/core/git.rs`, `src-tauri/src/commands/worktree.rs`
- Depends on: P3-T1, P1-T5 (projects) · Parallel with: P3-T2
- Context: `docs/specs/worktrees.md`, ADR-0005, `docs/06-security-guardrails.md` §3
- Prompt: "Implement worktrees per spec with the EXACT path convention
  `<repo>/../worktrees/<project-name>/<slug>` (canonicalized; create parents).
  `worktree_create/remove/status/diff/list` using libgit2 with a git-CLI fallback
  for `worktree add/remove` and `push`. Slugging: lowercase/hyphen/fs-safe/
  collision-suffixed. NEVER touch the main checkout. Unit tests for path+slug
  (assert the exact convention); integration tests against temp git repos for
  create/status/diff/remove asserting main checkout untouched."
- DoD: worktrees always at the required path; full lifecycle vs real git; main
  checkout never modified; tests pass.

### P3-T4 — Review-changes diff core
- Model: **Tier A — Sonnet 4.6**
- Lane: RUST-CORE (`core/review.rs`) + reuse `worktree_diff`
- Owns: `src-tauri/src/core/review.rs`, staging command(s) in `commands/review.rs`
- Depends on: P3-T3 · Parallel with: P3-T5
- Context: `docs/specs/side-panel.md` (review), `docs/specs/worktrees.md`
- Prompt: "Provide a structured diff model (per-file, per-hunk) from
  `worktree_diff`, and staging operations mapping to git index ops (stage/unstage
  hunk/file) for a worktree. Integration test against a temp repo: produce a
  diff, stage a hunk, verify the index."
- DoD: structured diff + staging work against real git; tests pass.

### P3-T5 — Terminal UI (xterm.js)
- Model: **Tier B — Grok**
- Lane: UI-FEATURE (`src/features/terminal/**`)
- Owns: `src/features/terminal/**`
- Depends on: P3-T2 · Parallel with: P3-T4
- Context: `docs/specs/terminal.md`, `docs/10-ui-ux-layout.md`
- Prompt: "Build the terminal view with xterm.js + fit addon, themed via tokens:
  tab per terminal, cwd label, new/close. Wire keystrokes→`pty_write`, output
  from `pty:{id}:data`, resize (debounced)→`pty_resize`. Default cwd = active
  project/worktree. Component test for mount/resize."
- DoD: interactive terminal works in-app; resize + multiple tabs; no leaks.

### P3-T6 — Side-panel shell (dockable tabs)
- Model: **Tier A — Sonnet 4.6**
- Lane: UI app shell (`src/app/shell/side-panel/**`)
- Owns: `src/app/shell/side-panel/**`
- Depends on: Phase 0 shell · Parallel with: P3-T7, P3-T8
- Context: `docs/specs/side-panel.md`, `docs/10-ui-ux-layout.md`
- Prompt: "Build the dockable, resizable right side panel with four tabs
  (Browser/Chat/Terminal/Review) matching Codex. Persist open/active-tab/width
  per project+workspace via `settings_*`. Lazily mount each surface on first open
  (efficiency). This phase wires Terminal + Review tabs; Browser/Chat tabs are
  placeholders until Phase 6. Tests: layout persistence, lazy mount."
- DoD: panel docks/resizes/persists; surfaces mount lazily.

### P3-T7 — Diff viewer UI (review tab)
- Model: **Tier A — Sonnet 4.6**
- Lane: UI-FEATURE (`src/features/side-panel/review/**`)
- Owns: `src/features/side-panel/review/**`
- Depends on: P3-T4, P3-T6 · Parallel with: P3-T8
- Context: `docs/specs/side-panel.md`
- Prompt: "Build the Review-changes surface: file tree + diff (CodeMirror),
  per-file/per-hunk view, stage/approve actions calling the review staging
  commands. Virtualize large diffs. Component tests with mocked diff data."
- DoD: renders worktree diffs; staging maps to git; large diffs stay smooth.

### P3-T8 — Panel tab component (shared)
- Model: **Tier C — MiniMax M3** (free; tiny shared primitive)
- Lane: UI-SHARED (`src/components/ui/Tabs*.tsx`)
- Owns: `src/components/ui/Tabs.tsx`, related styles
- Depends on: P0-T7 tokens · Parallel with: P3-T6, P3-T7
- Context: `docs/10-ui-ux-layout.md`
- Prompt: "Create a reusable tokenized Tabs component (keyboard accessible) used
  by the side panel and terminal. No feature logic. Snapshot/interaction test."
- DoD: accessible Tabs primitive; consumed by panel/terminal; tests pass.

---

## Phase 3 sync step (P3-S)
- Model: **Tier S — Opus 4.8** (Integrator); Tier S reviews P3-T3.
- Merge order: T1 → T2,T3 → T4,T5 → T6,T7,T8.
- Exit: open terminals; create/review/remove worktrees at the required path;
  review diffs in the panel; no orphan processes. (Roadmap Phase 3 exit.)
