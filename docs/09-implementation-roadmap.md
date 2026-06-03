# 09 — Implementation Roadmap

Phased, spec-driven plan. Each phase ends with working, tested software. Features
map to `docs/specs/`. Do phases in order; within a phase, slices can parallelize.

## Phase 0 — Scaffolding & foundations

**Goal:** an empty-but-running Tauri app with the architecture skeleton, CI, and
the typed IPC pipeline.

1. Scaffold the app:
   ```bash
   npm create tauri-app@latest -- --template react-ts
   # → move into this repo layout (docs/03-project-structure.md)
   ```
2. Set up `src/` (Vite/React/TS, Tailwind, tokens stub) and `src-tauri/` per
   `docs/03-project-structure.md`.
3. Lock down `tauri.conf.json` capabilities + CSP (`docs/06-security-guardrails.md`).
4. Add SQLite (`sqlx`) + first migration; `AppState` with db pool + registries.
5. Wire `ts-rs` binding generation → `src/lib/bindings.ts` (ADR-0007).
6. Add `lib/ipc.ts` typed wrapper; one trivial command end-to-end.
7. Stand up CI (`docs/08-ci-cd.md`): lint, rust-checks, bindings-drift, tests,
   build, perf-smoke skeleton.
8. Establish the perf-smoke baseline vs `docs/00-vision-scope.md` targets.

**Exit:** `npm run tauri dev` opens a window; one command round-trips with
generated types; CI green; perf baseline recorded.

## Phase 1 — Auth, workspaces, projects, settings

**Specs:** `auth.md`, `workspaces.md`, `projects.md`, `profile-settings.md`.

- `LlmProvider` trait + `openai`/`chatgpt` impls (transport only).
- Keyring integration; PKCE loopback OAuth; API-key validation.
- Workspace/project CRUD + scoping; default-workspace bootstrap.
- Settings layering (workspace > global > default); theme.
- Onboarding UI (both auth paths).

**Exit:** sign in (either method), create workspace, add a project, change theme;
all persisted; tests per specs pass.

## Phase 2 — Chats, model switching, file upload, plan mode

**Specs:** `chats.md`, `model-switching.md`, `file-upload.md`, `plan-mode.md`.

- Streaming chat (SSE) with events; cancel; message tree/edit.
- Virtualized transcript; composer; markdown/code rendering.
- Model picker + capability gating; usage tally hook.
- File staging (path + bytes) in Rust; attachment formatting per model.
- Plan mode (read-only harness during planning) — needs Phase 4 harness stub.

**Exit:** real conversations stream smoothly; attachments + model switch + plan
mode work; perf targets hold under streaming.

## Phase 3 — Terminal, worktrees, side panel (terminal/review)

**Specs:** `terminal.md`, `worktrees.md`, `side-panel.md` (terminal + review).

- PTY backend (`portable-pty`) + xterm.js; process registry.
- Worktree manager enforcing `../worktrees/<project>/<feature>`; status/diff.
- Side panel shell with dockable tabs; review-changes diff viewer + staging.

**Exit:** open terminals, create/review/remove worktrees, review diffs in the
panel; no orphan processes.

## Phase 4 — Harness/guardrails, then Agents

**Specs:** `permissions-guardrails.md` (first), then `agents.md`.

- Harness policy engine + built-in profiles + approval flow (enforced in Rust).
- Optional bubblewrap sandbox; deny-list; path-escape prevention.
- Agent orchestrator (ADR-0005): worktree per run, agent loop under harness,
  commit → push branch → open PR (`gh`/REST); parallel isolated runs.
- Agent UI: start, live timeline, approvals, PR links.

**Exit:** multiple agents run in parallel, each opens a PR on its own branch from
its own worktree, all bounded by harness profiles with working approval gates.

## Phase 5 — MCP & plugins

**Specs:** `mcp.md`, `plugins.md`.

- MCP client host (stdio/SSE/HTTP); tool discovery/call; secret env via keyring.
- Tools exposed to chats/agents through the harness.
- Plugin manifest + install/enable/configure; contributions (MCP/agent/tools).

**Exit:** add a custom MCP server and a plugin; invoke their tools from chats/
agents safely.

## Phase 6 — Sites, automations, browser side panel, pinned, usage dashboard

**Specs:** `sites.md`, `automations.md`, `side-panel.md` (browser + chat),
`pinned.md`, `usage.md`.

- Sites: dev-command/static serving + URL detection; sandboxed browser tab.
- Automations: scheduler (cron) + actions (prompt/agent/command) + history.
- Side chat tab; pinned section; usage dashboard (tally + API refresh).

**Exit:** preview a site in-app, run an automation, pin items, view usage.

## Phase 7 — Remote Mobile

**Spec:** `remote-mobile.md` (+ a transport ADR before coding).

- Pairing (short-lived codes), encrypted authenticated channel, device mgmt.
- Remote commands mapped to core ops, bounded by harness; revocation.

**Exit:** pair a device (or simulator), drive the app remotely within guardrails,
revoke it.

## Phase 8 — Parity hardening & release

- Visual regression pass at 100/125/150% × light/dark across all screens.
- Empty/loading/error states everywhere; keyboard shortcuts + command palette.
- Perf tuning to comfortably meet targets; memory leak checks.
- Packaging: `.deb`/`.rpm`/AppImage/Arch/Nix; release pipeline; checksums.

**Exit:** pixel-parity verified; all CI layers green; reproducible installable
artifacts; v1 release.

## Cross-cutting (every phase)

- Update the relevant spec when behavior changes; keep IPC/data-model docs in
  sync; regenerate bindings.
- Add the spec's required tests with the feature.
- Keep the perf-smoke green.

## Suggested milestones

| Milestone | Phases | Outcome |
|-----------|--------|---------|
| M1 "Talk" | 0–2 | Auth + projects + streaming chat |
| M2 "Build" | 3–4 | Terminal, worktrees, agents+PRs, guardrails |
| M3 "Extend" | 5–6 | MCP/plugins, sites, automations, usage, pinned |
| M4 "Reach" | 7 | Remote mobile |
| M5 "Ship" | 8 | Parity + packaging + release |
