# Phase 4 — Harness/Guardrails, then Agents (agent task plan)

**Goal:** the harness policy engine (enforced in Rust) and the agent orchestrator
that runs multiple agents in parallel, each in its own worktree, each opening a
PR on a new branch. **This is the highest-risk phase — Tier S heavy, Tier C = 0.**

Specs: [`permissions-guardrails.md`](../specs/permissions-guardrails.md) (FIRST),
[`agents.md`](../specs/agents.md). Security model:
[`../06-security-guardrails.md`](../06-security-guardrails.md). ADR-0005.

## Wave plan

```
Wave 1: P4-T1 migration(harness/agent/event)  ─ MIGRATION
Wave 2: P4-T2 HARNESS ENGINE (S)  ── everything else depends on this
Wave 3 (parallel): P4-T3 sandbox(S)  P4-T4 PR adapter(A)  + swap plan-mode shim
Wave 4: P4-T5 AGENT ORCHESTRATOR (S, depends T2,T3,T4 + worktrees)
Wave 5 (parallel): P4-T6 agent commands+events(A)  P4-T7 approval+profile UI(A)  P4-T8 agent timeline UI(B)
Sync: P4-S (Tier S, full security suite)
```

> No free-tier (C) tasks this phase. No task may weaken a guardrail to "make it
> work" (CLAUDE.md rule 6).

---

### P4-T1 — Harness/agent schema migration
- Model: **Tier A — Sonnet 4.6** · Lane: MIGRATION
- Owns: `migrations/0005_*.sql`, models for `agent_run`, `agent_event` (and finalize `harness_profile`)
- Depends on: Phase 3 · Parallel with: none
- Context: `docs/04-data-model.md`
- Prompt: "Add migration `0005` for `agent_run` and `agent_event`, and finalize
  `harness_profile` columns per docs/04-data-model.md. Seed the five built-in
  harness profiles (Read-only/Suggest/Auto-edit/Agent(PR)/Full-auto) from
  docs/06-security-guardrails.md §2. Add models (serde+TS)."
- DoD: applies; built-in profiles seeded; models compile.

### P4-T2 — Harness policy engine (the core of security)
- Model: **Tier S — Opus 4.8**
- Lane: RUST-CORE (`harness/**`) + `commands/harness.rs`
- Owns: `src-tauri/src/harness/**`, `src-tauri/src/commands/harness.rs`
- Depends on: P4-T1 · Parallel with: none (everything waits on it)
- Context: `docs/specs/permissions-guardrails.md`, `docs/06-security-guardrails.md`
- Prompt: "Implement the harness policy engine per spec + security doc:
  `policy_json` schema (fs/shell/network/git/sandbox/approval_mode/budgets);
  `harness::evaluate(profile, action) -> Allow|Confirm|Deny` enforced at the
  execution boundary; hard deny-list always wins (secrets, .git/config,
  destructive shell); path canonicalization rejecting traversal/symlink escape;
  fs write-confinement to the worktree; approval flow (`*:approval_req` +
  `*_approve`, timeout=deny, 'always-allow-this-kind' scoped to a run). Implement
  `harness_*` commands. Also replace the Phase-2 plan-mode read-only shim with a
  real read-only profile. Extensive unit tests: the allow/confirm/deny matrix
  across fs/shell/net/git, deny-list precedence, path-escape rejection, budgets;
  fuzz shell/path inputs for bypass; assert secrets unreachable even under
  Full-auto."
- DoD: matrix behaves per spec; enforcement is in Rust; no bypass/escape in
  fuzz tests; deny-list wins under Full-auto.

### P4-T3 — Sandbox (bubblewrap) integration
- Model: **Tier S — Opus 4.8** (isolation correctness)
- Lane: RUST-CORE (`harness/sandbox.rs`)
- Owns: `src-tauri/src/harness/sandbox.rs`
- Depends on: P4-T2 · Parallel with: P4-T4
- Context: `docs/06-security-guardrails.md` §4
- Prompt: "Add an optional bubblewrap (`bwrap`) sandbox for shell/agent execution:
  bind-mount only the worktree, drop network when policy says so. Degrade
  gracefully to confirm-mode + deny-list when `bwrap` is unavailable (detect via
  `which`). Tests: command runs confined; network dropped when configured;
  graceful fallback path."
- DoD: sandboxed execution works where bwrap exists; safe documented fallback.

### P4-T4 — PR adapter (gh + REST fallback)
- Model: **Tier A — Sonnet 4.6**
- Lane: RUST-CORE (`core/pr.rs`)
- Owns: `src-tauri/src/core/pr.rs`
- Depends on: P3-T3 (git push) · Parallel with: P4-T3
- Context: `docs/specs/agents.md` (PR automation), ADR-0005
- Prompt: "Implement PR creation: push a branch to `origin` (never force, never
  the default branch), then open a PR via `gh` CLI if present, else the git host
  REST API (token from keyring). Generate title/body from the task + change
  summary. Handle no-remote/no-permission by completing locally and reporting 'PR
  skipped'. Integration test against a fake remote + mock host API."
- DoD: branch pushed + PR opened against mocks; safe no-remote handling.

### P4-T5 — Agent orchestrator
- Model: **Tier S — Opus 4.8** (parallel isolation + harness gating)
- Lane: RUST-CORE (`core/agents.rs`)
- Owns: `src-tauri/src/core/agents.rs`
- Depends on: P4-T2, P4-T3, P4-T4, P3-T3 · Parallel with: none
- Context: `docs/specs/agents.md`, ADR-0005
- Prompt: "Implement the agent orchestrator per spec as a Rust state machine:
  queued→running→(needs_approval)→done/failed/cancelled. On start, optionally
  create a worktree+branch (slug from task); drive the agent loop (model proposes
  action → harness::evaluate → execute/approve/deny → append agent_event); stream
  `agent:{run_id}:progress|tool_call|approval_req|diff|pr|done|error`. On success
  commit→push→open PR via P4-T4. A pluggable `AgentBackend` trait (claude/codex/
  custom). Multiple runs execute concurrently, fully isolated (own worktree,
  branch, child processes); cancel kills children and leaves the worktree per
  caller choice. Integration tests: full run on a temp repo+fake remote creates
  worktree/commits/pushes/opens PR; approval gate pauses/resumes; TWO agents in
  parallel produce two isolated branches/PRs; cancel leaves no orphans."
- DoD: parallel isolated agents each open a PR; all actions gated by harness;
  cancel clean; tests pass.

### P4-T6 — Agent commands + events surface
- Model: **Tier A — Sonnet 4.6**
- Lane: RUST-CMD (`commands/agents.rs`)
- Owns: `src-tauri/src/commands/agents.rs`
- Depends on: P4-T5 · Parallel with: P4-T7, P4-T8
- Context: `docs/05-ipc-contract.md` (agents)
- Prompt: "Expose `agent_start/get/list/cancel/approve/open_pr` per the IPC
  contract, delegating to the orchestrator. Validate inputs; map errors to
  AppError. Thin layer + a smoke integration test."
- DoD: all agent commands callable end-to-end; contract matches bindings.

### P4-T7 — Approval prompt + harness profile editor UI
- Model: **Tier A — Sonnet 4.6**
- Lane: UI-FEATURE (`src/features/guardrails/**`)
- Owns: `src/features/guardrails/**`
- Depends on: P4-T2, P4-T6 · Parallel with: P4-T8
- Context: `docs/specs/permissions-guardrails.md`, `docs/10-ui-ux-layout.md`
- Prompt: "Build the harness chip (composer/status bar) showing the active
  profile + permission icon; the profile editor (fs/shell/network/git/sandbox/
  approval_mode/budgets) under Settings→Permissions; and the approval prompt UI
  (shows exact command/diff/network/paths with Approve/Deny/Always-allow-kind).
  Wire to `harness_*` + `*_approve`. Tests with mocked IPC."
- DoD: active profile always visible; approvals block until resolved; editor
  saves valid policies.

### P4-T8 — Agent run timeline UI
- Model: **Tier B — Gemini 3.5 Flash**
- Lane: UI-FEATURE (`src/features/agents/**`)
- Owns: `src/features/agents/**`
- Depends on: P4-T6 · Parallel with: P4-T7
- Context: `docs/specs/agents.md`, `docs/10-ui-ux-layout.md`
- Prompt: "Build the Agents sidebar list (status dots) and the run detail view:
  live timeline (steps, tool calls, diffs) from `agent:{run_id}:*` events,
  inline approval prompts, links to worktree + PR. 'Start agent' form (task,
  kind, profile, auto-worktree, auto-pr). Tests with mocked event streams."
- DoD: live timeline updates; start/cancel/approve from UI; PR link shown.

---

## Phase 4 sync step (P4-S)
- Model: **Tier S — Opus 4.8** (Integrator). Tier S MUST review T2,T3,T5
  (and T4 PR-auth). Run the FULL security suite (fuzz, secret-leak, escape) +
  parallel-agent integration + e2e.
- Merge order: T1 → T2 → T3,T4 → T5 → T6,T7,T8.
- Exit: multiple agents run in parallel, each opens a PR on its own branch from
  its own worktree, all bounded by harness profiles with working approval gates.
  (Roadmap Phase 4 exit.)
