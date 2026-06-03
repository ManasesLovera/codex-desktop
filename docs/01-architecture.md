# 01 — System Architecture

## Overview

Two trust zones connected by a typed IPC boundary:

```
┌──────────────────────────────────────────────────────────────────────┐
│  WebView (untrusted renderer) — WebKitGTK                              │
│                                                                        │
│  React + TS UI ──────────────────────────────────────────────┐       │
│   • feature-sliced views (chats, terminal, agents, …)         │       │
│   • Zustand stores + TanStack Query                           │       │
│   • xterm.js (render only), markdown, code editor             │       │
│                                                               │       │
│   lib/ipc.ts  ── invoke() / event listeners ─────────────────┘       │
└───────────────────────────────│──────────────────────────────────────┘
                                 │  Tauri IPC (typed commands + events)
┌────────────────────────────────▼──────────────────────────────────────┐
│  Rust Core (trusted) — the authority                                    │
│                                                                         │
│  commands/   #[tauri::command] surface (the only door in)               │
│  core/                                                                  │
│    ├ projects   ├ workspaces  ├ chats      ├ agents (orchestrator)      │
│    ├ pty        ├ git/worktree├ automations├ sites    ├ pinned          │
│  providers/   OpenAI API + ChatGPT OAuth (streaming SSE)                │
│  mcp/         MCP client host (spawn/connect external tool servers)     │
│  harness/     permissions, sandbox, approval gates                      │
│  store/       sqlx + SQLite (state) ; keyring (secrets)                 │
│                                                                         │
└───────┬───────────────┬──────────────┬───────────────┬─────────────────┘
        │               │              │               │
   OpenAI API      Local FS/git    PTY/processes    MCP servers
   ChatGPT OAuth   worktrees       terminal         (stdio/SSE)
```

## Trust model

- **WebView is untrusted.** It never holds secrets, never touches the FS, never
  spawns processes. It only calls typed commands and renders results.
- **Rust core is the authority.** Every privileged action is a command, audited
  through the harness/guardrail layer where relevant.
- Tauri's `capabilities`/allowlist is locked down: no `fs`, `shell`, or `http`
  plugin exposed directly to JS. Custom commands wrap everything.

## Process & threading model

- **Single OS process** (the Tauri app) hosts the WebView + Rust runtime.
- Rust uses **Tokio** for async I/O (network, PTY, child processes).
- Long-running work (agents, PTY, LLM streams) runs as Tokio tasks and emits
  **events** to the frontend rather than blocking commands.
- Child processes (terminal PTYs, MCP servers, agent CLIs) are tracked in a
  registry so they are cleanly killed on window/workspace close.
- **No polling timers.** UI updates are event-driven (push), preserving the
  ~0% idle CPU target.

## Data flow patterns

### 1. Request/response (commands)

```
UI ── invoke("projects_list") ──▶ commands::projects_list ──▶ store ──▶ Vec<Project>
UI ◀────────────────  serialized JSON  ◀────────────────────────────────────┘
```

### 2. Streaming (events)

Used for LLM tokens, terminal output, agent progress, automation runs.

```
UI ── invoke("chat_send", {…}) ─▶ spawns Tokio task, returns stream_id
Rust task ── emit("chat:{stream_id}:delta", token) ─▶ UI appends (per frame)
Rust task ── emit("chat:{stream_id}:done", usage)  ─▶ UI finalizes
```

### 3. Subscriptions

The UI subscribes to channel topics (`agent:*`, `pty:*`, `mcp:*`) on mount and
unsubscribes on unmount; the Rust side only produces events that have listeners.

## Module responsibilities (Rust core)

| Module | Responsibility |
|--------|----------------|
| `commands/` | Thin IPC handlers; validate input, delegate to `core/`. |
| `core/projects` | CRUD for projects, repo detection, last-opened state. |
| `core/workspaces` | Workspace switching, scoping of projects/auth/settings. |
| `core/chats` | Conversation state, message tree, persistence, plan mode. |
| `core/agents` | Orchestrator: spawn agents, manage worktrees, open PRs. |
| `core/pty` | PTY lifecycle via `portable-pty`; stream I/O to events. |
| `core/git` | libgit2 ops: worktree add/remove, branch, diff, push. |
| `core/automations` | Scheduled/triggered task definitions + runner. |
| `core/sites` | "Sites" feature (preview/host static surfaces — see spec). |
| `core/pinned` | Pinned items index. |
| `providers/openai` | API-key transport (chat/completions, responses, usage). |
| `providers/chatgpt` | OAuth PKCE login + token refresh + transport. |
| `mcp/` | MCP client host; connect/spawn servers; expose tools to agents. |
| `harness/` | Permission policy engine + approval gates + sandbox config. |
| `store/` | sqlx migrations, models, queries; keyring secret access. |

## Frontend architecture

- **Feature-sliced**: `src/features/<feature>/` mirrors `docs/specs/<feature>.md`.
  Each slice owns its components, hooks, store, and IPC calls.
- **Shell**: `src/app/` holds the window chrome — left sidebar, main area,
  dockable right side panel, command palette — matching Codex layout (see
  `docs/10-ui-ux-layout.md`).
- **State**: Zustand for local UI state; TanStack Query for command-backed data
  with cache invalidation on relevant events.
- **IPC client**: `src/lib/ipc.ts` is the single typed wrapper over Tauri's
  `invoke`/`listen`. Types are generated from Rust via `ts-rs` (see ADR-0007) so
  the contract can't drift.

## Persistence layout

```
$XDG_DATA_HOME/codex-desktop/
  app.db                 # SQLite (workspaces, projects, chats, automations…)
  logs/                  # rotating logs
$XDG_CONFIG_HOME/codex-desktop/
  settings.json          # non-secret prefs (theme, layout)
OS keyring               # API keys, OAuth tokens (never on disk)
../worktrees/<project>/<feature>/   # agent worktrees (sibling of repo)
```

## Key cross-cutting concerns

- **Security/guardrails**: every agent/terminal/file action passes the harness
  policy (`docs/06-security-guardrails.md`, `docs/specs/permissions-guardrails.md`).
- **Observability**: structured `tracing` logs in Rust; ring-buffer surfaced in a
  debug panel. No external telemetry by default.
- **Error model**: commands return `Result<T, AppError>`; `AppError` serializes
  to a typed shape the UI renders as toasts/inline errors.
- **Cancellation**: every streaming task is cancellable via a `cancel(stream_id)`
  command that drops the task and kills child processes.

See `docs/05-ipc-contract.md` for the concrete command list and event topics.
