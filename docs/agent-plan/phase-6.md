# Phase 6 — Sites, Automations, Browser Panel, Pinned, Usage (agent task plan)

**Goal:** preview sites in-app, run automations, browse in the side panel, pin
items, and view usage. Mostly independent features — high parallelism.

Specs: [`sites.md`](../specs/sites.md), [`automations.md`](../specs/automations.md),
[`side-panel.md`](../specs/side-panel.md) (browser+chat), [`pinned.md`](../specs/pinned.md),
[`usage.md`](../specs/usage.md). Routing: [`../11-agent-automation-guide.md`](../11-agent-automation-guide.md).

## Wave plan

```
Wave 1: P6-T1 migration(site, automation(+run), pinned, usage_snapshot) ─ MIGRATION
Wave 2 (core, highly parallel):
  P6-T2 sites runner(A)  P6-T3 automation scheduler(A)  P6-T4 usage(A)  P6-T5 pinned(B)
Wave 3 (UI, parallel):
  P6-T6 sites UI(B)  P6-T7 automations UI(B)  P6-T8 browser+chat panel tabs(A)
  P6-T9 usage dashboard UI(B)  P6-T10 pinned UI(C)  P6-T11 price table(C)
Sync: P6-S
```

---

### P6-T1 — Schema migration (sites/automations/pinned/usage)
- Model: **Tier A — Sonnet 4.6** · Lane: MIGRATION
- Owns: `migrations/0007_*.sql`, models for `site`,`automation`,`automation_run`,`pinned`,`usage_snapshot`
- Depends on: Phase 5 · Context: `docs/04-data-model.md`
- Prompt: "Add migration `0007` for `site`, `automation`, `automation_run`,
  `pinned`, `usage_snapshot` per docs/04-data-model.md. Add models (serde+TS)."
- DoD: applies; models compile.

### P6-T2 — Sites runner core + commands
- Model: **Tier A — Sonnet 4.6** · Lane: RUST-CORE+CMD (`core/sites.rs`, `commands/sites.rs`)
- Owns: `src-tauri/src/core/sites.rs`, `src-tauri/src/commands/sites.rs`
- Depends on: P6-T1 · Parallel with: P6-T3,P6-T4,P6-T5
- Context: `docs/specs/sites.md`
- Prompt: "Implement sites per spec: create, start (spawn dev_command as tracked
  child in root_path; detect served URL from stdout or config; OR serve a static
  dir on a loopback ephemeral port), stop, status; `site:{id}:status|log`. Stop
  all on window close; port-in-use handling. Integration test: start
  `python -m http.server`, detect URL, stop; static serving."
- DoD: dev-command + static sites start/expose URL/stop cleanly; no orphans.

### P6-T3 — Automation scheduler core + commands
- Model: **Tier A — Sonnet 4.6** · Lane: RUST-CORE+CMD (`core/automations.rs`, `commands/automations.rs`)
- Owns: `src-tauri/src/core/automations.rs`, `src-tauri/src/commands/automations.rs`
- Depends on: P6-T1, P2-T2 (chat action), P4-T5 (agent action)
- Parallel with: P6-T2,P6-T4,P6-T5
- Context: `docs/specs/automations.md`
- Prompt: "Implement automations per spec: CRUD; a Tokio scheduler + cron parser
  firing `schedule` automations; actions = prompt (create+send chat) | agent
  (start run under a harness profile) | command (run under harness); run history
  + logs; `automation_run_now`; overlap policy; missed-run handling when app was
  closed. Privileged actions never auto-elevate; approvals pause+notify. Tests
  with a fake clock: next-fire, dispatch, failure, overlap."
- DoD: schedule/manual triggers + all 3 action types work and log; harness
  respected.

### P6-T4 — Usage core + commands
- Model: **Tier A — Sonnet 4.6** · Lane: RUST-CORE+CMD (`core/usage.rs`, `commands/usage.rs`)
- Owns: `src-tauri/src/core/usage.rs`, `src-tauri/src/commands/usage.rs`
- Depends on: P6-T1, P2-T2 (tally hook) · Parallel with: P6-T2,P6-T3,P6-T5
- Context: `docs/specs/usage.md`
- Prompt: "Implement usage per spec: local tally on every completed request into
  `usage_snapshot`; `usage_refresh` merges provider API usage where available
  (no double counting); `usage_summary` aggregates by range/model; cost from a
  price table (consume P6-T11). Tests: tally accumulation, range aggregation,
  merge-without-double-count, cost computation."
- DoD: accurate tally; merge correct; per-account/model/range breakdowns.

### P6-T5 — Pinned core + commands
- Model: **Tier B — Gemini 3.5 Flash** · Lane: RUST-CORE+CMD (`core/pinned.rs`, `commands/pinned.rs`)
- Owns: `src-tauri/src/core/pinned.rs`, `src-tauri/src/commands/pinned.rs`
- Depends on: P6-T1 · Parallel with: P6-T2,P6-T3,P6-T4
- Context: `docs/specs/pinned.md`
- Prompt: "Implement pinned per spec: add/remove/reorder/list, polymorphic
  targets, position math, stale-pin pruning, workspace scoping. Unit tests for
  ordering + pruning."
- DoD: pin/unpin/reorder across kinds; stale pins pruned; scoped.

### P6-T6 — Sites UI
- Model: **Tier B — Grok** · Lane: UI-FEATURE (`src/features/sites/**`)
- Owns: `src/features/sites/**` · Depends on: P6-T2
- Parallel with: other Wave-3 · Context: `docs/specs/sites.md`
- Prompt: "Build the Sites sidebar section + manager: list (status/URL), create,
  start/stop, open in side-panel browser, logs. Wire `site_*`. Tests mocked."
- DoD: manage + preview sites from UI.

### P6-T7 — Automations UI
- Model: **Tier B — Gemini 3.5 Flash** · Lane: UI-FEATURE (`src/features/automations/**`)
- Owns: `src/features/automations/**` · Depends on: P6-T3
- Context: `docs/specs/automations.md`
- Prompt: "Build the Automations section + editor (name, trigger picker, action
  type, target project) + run history/log viewer. Wire `automation_*`. Tests
  mocked."
- DoD: create/run/inspect automations from UI.

### P6-T8 — Browser + side-chat panel tabs
- Model: **Tier A — Sonnet 4.6** (sandboxed webview, security-relevant)
- Lane: UI-FEATURE (`src/features/side-panel/browser/**`, `.../chat/**`)
- Owns: `src/features/side-panel/browser/**`, `src/features/side-panel/chat/**`
- Depends on: P3-T6 (panel shell), P6-T2 (site URLs), Phase-2 chat
- Context: `docs/specs/side-panel.md`, `docs/06-security-guardrails.md`
- Prompt: "Implement the Browser tab as a SANDBOXED webview (no Node, strict CSP,
  navigation restricted to loopback/allow-list, cannot reach app IPC) with
  restricted address bar + back/forward/reload, used to preview sites. Implement
  the side Chat tab reusing the chat UI in compact layout. Tests: navigation
  allow-list, lazy mount."
- DoD: browser sandboxed + navigation-restricted; side chat works.

### P6-T9 — Usage dashboard UI
- Model: **Tier B — Grok** · Lane: UI-FEATURE (`src/features/usage/**`)
- Owns: `src/features/usage/**` · Depends on: P6-T4
- Context: `docs/specs/usage.md`
- Prompt: "Build the Usage view: summary cards (today/7d/30d), time-series chart,
  per-model table; titlebar/status glance. Wire `usage_*`. Tests mocked."
- DoD: usage renders and updates after a chat.

### P6-T10 — Pinned UI
- Model: **Tier C — MiniMax M3** (free; small) · Lane: UI-FEATURE (`src/features/pinned/**`)
- Owns: `src/features/pinned/**` · Depends on: P6-T5
- Context: `docs/specs/pinned.md`
- Prompt: "Build the Pinned sidebar section: pin/unpin (context menu/icon),
  drag-to-reorder, type icons + live status. Wire `pinned_*`. Basic test."
- DoD: pin/reorder/unpin from UI; order persists.

### P6-T11 — Model price table
- Model: **Tier C — DeepSeek v4 Flash** (free; data file) · Lane: RUST-CORE (`core/pricing.rs` data)
- Owns: `src-tauri/src/core/pricing.rs` (+ a JSON data file)
- Depends on: P6-T1 · Parallel with: P6-T4 (consumer)
- Context: `docs/specs/usage.md`
- Prompt: "Create a model price table (per-model input/output $/1K tokens) as a
  data file + a small loader used by usage cost estimation. Mark estimates as
  updatable. Trivial unit test for lookup."
- DoD: price lookup works; consumed by usage.

---

## Phase 6 sync step (P6-S)
- Model: **Tier S — Opus 4.8** (Integrator); Tier S reviews P6-T8 (sandboxed
  browser). Full CI + e2e (preview site, run automation, pin, usage updates).
- Merge order: T1 → T2,T3,T4,T5,T11 → T6,T7,T8,T9,T10.
- Exit: preview a site in-app, run an automation, pin items, view usage.
  (Roadmap Phase 6 exit.)
