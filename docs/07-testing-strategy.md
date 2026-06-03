# 07 — Testing Strategy

Tests ship **with** features. A feature is not "done" until its spec's required
tests exist and pass. Each spec in `docs/specs/` lists its concrete tests; this
document defines the overall approach and the bar for "done".

## Test pyramid

```
        ┌───────────────┐
        │   E2E (few)    │  tauri-driver / WebDriver on WebKitGTK
        ├───────────────┤
        │ Integration   │  Rust ↔ real SQLite/git/PTY/mock providers
        ├───────────────┤
        │ Unit (many)    │  Rust logic + TS components/hooks
        └───────────────┘
   + Visual regression (screenshots) for pixel parity
   + Perf smoke (RAM/startup) guarding the efficiency goal
```

## Layers

### 1. Rust unit tests
- `#[cfg(test)]` modules next to code.
- Cover: harness policy evaluation, path/slug logic (worktrees), PKCE/auth,
  orchestrator state machine, settings layering, usage tally, cron parsing,
  MCP tool namespacing, error mapping.
- No network/FS unless via tempdir; external calls mocked.

### 2. Rust integration tests
- In `src-tauri/tests/`. Use **real** SQLite (temp file), **real** git (temp
  repos), **real** PTY, and **mock HTTP servers** (e.g. `wiremock`) for providers
  and git-host APIs.
- Cover: full command flows (chat streaming, agent run → worktree → branch →
  push → PR against a fake remote/host API), migrations, worktree lifecycle,
  approval gates, MCP handshake (mock server), automation scheduling with a
  fake clock.

### 3. Frontend unit tests (Vitest + Testing Library)
- Components, hooks, stores. Mock the IPC layer (`lib/ipc.ts`).
- Cover: composer behavior, model switcher gating, transcript virtualization
  logic, approval-prompt rendering, settings forms, panel state.

### 4. End-to-end (tauri-driver / WebDriver)
- Drive the **real built app** on WebKitGTK via `tauri-driver`.
- Providers/git-host mocked behind a test-mode flag so e2e is deterministic and
  offline.
- Golden-path scenarios per feature (see each spec's E2E list): onboarding (both
  auth paths, OAuth mocked), send/stream/stop a chat, start an agent and approve
  an action, create/review/remove a worktree, terminal I/O, MCP add+invoke,
  site start+preview, automation run, settings persistence, workspace switch.

### 5. Visual regression (pixel parity)
- Screenshot tests of key screens at 100%/125%/150% scale, light+dark.
- Baselines captured from our implementation and reviewed against Codex
  references during development; diffs above threshold fail CI.
- Tooling: deterministic render mode (seeded data, disabled animations) +
  pixel-diff. Stored baselines per screen.

### 6. Performance smoke
- Measured in CI on the built app: cold-start-to-interactive, idle RAM (1 window/
  1 chat), idle CPU. Fails if it regresses past the targets in
  `docs/00-vision-scope.md` (with a tolerance band).

### 7. Security tests
- Assert secrets never appear in DB rows, logs, events, or the WebView.
- Harness fuzzing: shell/path inputs cannot bypass deny-list or escape the
  worktree confinement, including under Full-auto.
- Remote-mobile: revoked devices rejected; no secret crosses the channel.

## Coverage & quality bars

- Rust: meaningful coverage on `core/`, `harness/`, `providers/`, `mcp/` (target
  ≥ 80% lines on these modules; logic-heavy paths prioritized over glue).
- TS: components/hooks with behavior, not snapshots-for-the-sake-of-it.
- Every bug fix adds a regression test.
- No feature merges without its spec's listed tests.

## Test data & determinism

- Deterministic IDs/clock in tests (injectable `Clock`/`IdGen`).
- Mock providers replay fixture SSE streams from `tests/fixtures/`.
- Temp dirs for all FS/git; cleaned up after.
- A global **test mode** makes the app use mock providers/hosts and a temp data
  dir.

## Running locally

```bash
cargo test --manifest-path src-tauri/Cargo.toml     # rust unit + integration
npm test                                            # vitest
npm run test:e2e                                     # tauri-driver e2e
npm run test:visual                                  # screenshot regression
npm run test:perf                                    # perf smoke (optional local)
```

## Definition of done (per feature)

1. Unit + integration tests from the spec pass.
2. E2E golden path passes.
3. Visual parity check passes for new/changed screens.
4. No security assertion violated.
5. Perf smoke still within targets.
