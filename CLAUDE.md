# CLAUDE.md

> Primary context file for AI agents (Claude Code, Codex, etc.) working in this
> repository. Read this first. It is the source of truth for *what* we are
> building, *how* the system is structured, and *the rules* you must follow.

## 1. What this project is

**Codex Desktop (Tauri Edition)** is a from-scratch, RAM/CPU-efficient native
Linux desktop application that is a **1:1 visual and functional clone** of
OpenAI's Codex Desktop app.

The reference app (`https://github.com/ilysenko/codex-desktop-linux`) is an
*Electron repackaging* of OpenAI's macOS build. Electron bundles a full Chromium
runtime per window and idles at 300–600 MB RAM. **Our goal is to reproduce the
exact look and full feature set using [Tauri 2](https://tauri.app) + Rust**, so
the app idles in the ~80–150 MB range and uses the OS-native WebView (WebKitGTK)
instead of a bundled Chromium.

**Non-negotiable product goal:** the UI must match the real Codex Desktop
*pixel-for-pixel* (layout, spacing, typography, colors, motion, iconography) and
ship every feature listed in §4.

## 2. Tech stack (authoritative)

| Layer | Choice | Notes |
|-------|--------|-------|
| Shell / windowing | **Tauri 2** | Native WebView (WebKitGTK on Linux) |
| Core / backend | **Rust** (stable, edition 2021) | All process mgmt, FS, git, IPC |
| Frontend | **React 18 + TypeScript + Vite** | SolidJS considered; see ADR-0006 |
| Styling | **Tailwind CSS** + design tokens | Tokens mirror Codex; see `/design-system` |
| State (frontend) | **Zustand** + TanStack Query | Lightweight, no Redux |
| Local persistence | **SQLite** via `sqlx` (Rust side) | App state, chats, projects |
| Secrets | **OS keyring** via `keyring` crate | API keys, OAuth tokens |
| Terminal | **portable-pty** + `xterm.js` | PTY in Rust, render in WebView |
| Git/worktrees | **git2** (libgit2) + shell fallback | Worktree + PR automation |
| LLM transport | **`reqwest`** (streaming SSE) | OpenAI API + ChatGPT OAuth |
| Agent runtime | Rust task orchestrator | Spawns Codex/Claude agents |

> Do not introduce Electron, a second bundled browser, or a heavyweight state
> library (Redux Saga, MobX). Efficiency is a feature. See `docs/02-tech-stack.md`.

## 3. Repository architecture (high level)

```
codex-desktop/
├── CLAUDE.md                 # you are here
├── README.md                 # setup & run guide
├── docs/                     # spec-driven documentation (READ THESE)
│   ├── 00-vision-scope.md
│   ├── 01-architecture.md
│   ├── 02-tech-stack.md
│   ├── 03-project-structure.md
│   ├── 04-data-model.md
│   ├── 05-ipc-contract.md
│   ├── 06-security-guardrails.md
│   ├── 07-testing-strategy.md
│   ├── 08-ci-cd.md
│   ├── 09-implementation-roadmap.md
│   ├── 10-ui-ux-layout.md
│   ├── specs/                # one spec per feature (the backlog)
│   └── adr/                  # architecture decision records
├── src-tauri/                # Rust core (created in Phase 0)
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/         # #[tauri::command] handlers (IPC surface)
│   │   ├── core/             # domain logic (projects, agents, git, pty…)
│   │   ├── providers/        # OpenAI / ChatGPT transport
│   │   ├── store/            # sqlx models + migrations
│   │   └── mcp/              # MCP client host
│   └── tauri.conf.json
├── src/                      # React frontend
│   ├── app/                  # routing, layout shell
│   ├── features/             # feature-sliced UI (mirrors docs/specs)
│   ├── components/           # shared UI primitives (design system)
│   ├── lib/                  # ipc client, hooks, stores
│   └── styles/               # tailwind + tokens
└── tests/                    # e2e (WebDriver/tauri-driver), fixtures
```

**The frontend is dumb; the Rust core is authoritative.** Anything touching the
filesystem, network, git, processes, or secrets MUST live in Rust and be exposed
as a typed Tauri command. The WebView is never trusted with credentials or raw
shell access.

## 4. Feature set (must all ship — each has a spec)

| Feature | Spec |
|---------|------|
| Auth (ChatGPT OAuth **and** OpenAI API key) | `docs/specs/auth.md` |
| Projects | `docs/specs/projects.md` |
| Workspaces (multiple) | `docs/specs/workspaces.md` |
| Chats | `docs/specs/chats.md` |
| Model switching | `docs/specs/model-switching.md` |
| Plan mode | `docs/specs/plan-mode.md` |
| Terminal | `docs/specs/terminal.md` |
| Worktrees (`../worktrees/<project>/<feature>`) | `docs/specs/worktrees.md` |
| Claude/Codex agents (auto worktree + PR) | `docs/specs/agents.md` |
| Custom MCP servers | `docs/specs/mcp.md` |
| Plugins | `docs/specs/plugins.md` |
| Sites | `docs/specs/sites.md` |
| Automations | `docs/specs/automations.md` |
| Remote Mobile | `docs/specs/remote-mobile.md` |
| Usage check | `docs/specs/usage.md` |
| Profile & settings | `docs/specs/profile-settings.md` |
| Pinned | `docs/specs/pinned.md` |
| File upload | `docs/specs/file-upload.md` |
| Side panel (browser / chat / terminal / review) | `docs/specs/side-panel.md` |
| Harness permissions & guardrails | `docs/specs/permissions-guardrails.md` |

## 5. Commands (once scaffolded)

```bash
# Dev (hot-reload frontend + Rust)
npm install
npm run tauri dev

# Type-check / lint / format (frontend)
npm run typecheck && npm run lint && npm run format

# Rust checks
cargo fmt --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo test  --manifest-path src-tauri/Cargo.toml

# Frontend unit tests / e2e
npm test
npm run test:e2e

# Production bundle (.deb / .rpm / AppImage)
npm run tauri build
```

See `README.md` for full setup. Until `src-tauri/` exists, follow
`docs/09-implementation-roadmap.md` Phase 0.

## 6. Rules for AI agents working here

1. **Specs are law.** Before implementing a feature, read its spec in
   `docs/specs/`. If the spec is wrong or missing detail, update the spec in the
   same change — do not silently diverge.
2. **Match Codex's UI exactly.** Pixel parity is a hard requirement. Use the
   design tokens; never hardcode ad-hoc colors/spacing. Cross-check `/design-system`.
3. **Keep the WebView untrusted.** No secrets, no raw shell, no FS access from
   JS. Everything privileged is a Rust `#[tauri::command]` documented in
   `docs/05-ipc-contract.md`.
4. **Efficiency is a feature.** Prefer streaming, lazy loading, virtualized
   lists. Don't spawn idle threads/timers. Benchmark RAM against the targets in
   `docs/00-vision-scope.md`.
5. **Tests ship with features.** Every feature spec lists its required tests
   (unit/integration/e2e). A feature is not "done" without them. See
   `docs/07-testing-strategy.md`.
6. **Security boundaries are sacred.** Agents, terminal, and file ops run under
   the permission/guardrail system (`docs/specs/permissions-guardrails.md`).
   Never bypass a guardrail to make something work.
7. **Worktrees & PRs follow the convention** in `docs/specs/worktrees.md`:
   `../worktrees/<project-name>/<feature-or-fix>`. Agents push to the same repo
   on a new branch and open a PR.
8. **Small, reviewable changes.** One feature slice per PR where possible. Keep
   the IPC contract and data model docs in sync with code.
9. **No comments that restate code.** Document *why*, not *what*. Follow the
   conventions in `docs/03-project-structure.md`.

## 7. Glossary

- **Harness** — the controlled execution environment an agent runs in
  (permissions, sandbox, approval gates).
- **Worktree** — a git working tree checked out to a sibling branch so an agent
  can work in isolation without disturbing the user's checkout.
- **MCP** — Model Context Protocol; external tool servers the app connects to.
- **Side panel** — the right-hand dockable surface hosting browser/chat/terminal/
  review-changes views.
- **Workspace** — a top-level container grouping projects, settings, and auth.
