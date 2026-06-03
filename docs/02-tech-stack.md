# 02 — Tech Stack & Rationale

This document records *what* we use and *why*. Decisions with significant
trade-offs also have an ADR in `docs/adr/`.

## Summary table

| Concern | Choice | Alternative(s) rejected | ADR |
|---------|--------|-------------------------|-----|
| App shell | Tauri 2 | Electron, Wails, GTK-rs/Slint | ADR-0001 |
| Core language | Rust | Go, C++ | ADR-0002 |
| Frontend framework | React 18 + TS | SolidJS, Svelte | ADR-0006 |
| Build/dev server | Vite | webpack, esbuild raw | — |
| Styling | Tailwind + design tokens | CSS Modules, styled-components | — |
| Frontend state | Zustand + TanStack Query | Redux Toolkit, MobX, Jotai | — |
| Persistence | SQLite via `sqlx` | sled, JSON files, RocksDB | ADR-0003 |
| Secrets | OS keyring (`keyring` crate) | encrypted file, plaintext | ADR-0004 |
| Terminal | `portable-pty` + `xterm.js` | vte, alacritty embed | — |
| Git | `git2` (libgit2) + git CLI fallback | pure-Rust gix only | ADR-0005 |
| HTTP/LLM | `reqwest` + SSE streaming | hyper raw, isahc | — |
| Type sharing | `ts-rs` (Rust→TS types) | manual, OpenAPI, specta | ADR-0007 |
| Async runtime | Tokio | async-std | — |
| Logging | `tracing` + `tracing-subscriber` | log + env_logger | — |
| Frontend tests | Vitest + Testing Library | Jest | — |
| E2E | `tauri-driver` (WebDriver) | Playwright (won't drive WebKitGTK well) | — |

## Why Tauri over Electron (the core bet)

- **Memory**: native WebView (WebKitGTK) instead of a bundled Chromium per app.
  This is the entire reason the project exists — see `docs/00-vision-scope.md`
  targets and ADR-0001.
- **Bundle size**: tens of MB vs hundreds.
- **Security**: locked-down capability model; JS has no ambient FS/shell/network.
- **Rust core**: lets us put all heavy lifting (git, PTY, agents, streaming) in a
  fast, safe systems language.

Trade-off: WebKitGTK is less uniform than Chromium across distros. We mitigate
with conservative CSS, feature detection, and e2e tests on the real engine
(ADR-0001 covers the risk in detail).

## Why React (not Solid/Svelte)

Pixel-perfect parity with a large, complex UI benefits from the deepest
ecosystem (component libs, virtualization, editor/markdown/terminal integrations,
hiring/AI familiarity). The performance gap to Solid is irrelevant here because
the heavy work is in Rust and rendering is event-throttled. We keep React lean:
no Redux, virtualized lists, code-split features. See ADR-0006.

## Why SQLite via sqlx

Relational data (workspaces → projects → chats → messages; automations; pinned;
agent runs) maps naturally to tables. `sqlx` gives compile-time-checked queries
and async access. Single-file DB is easy to back up and inspect. See ADR-0003.

## Why OS keyring for secrets

API keys and OAuth tokens must never sit in plaintext or reach the WebView. The
`keyring` crate uses the Secret Service / kwallet on Linux. See ADR-0004 and
`docs/specs/auth.md`.

## Frontend libraries (allowed list)

- **xterm.js** + `@xterm/addon-fit` — terminal rendering.
- **@codemirror/** or **monaco** — code/diff display in review panel (decide in
  side-panel spec; lean CodeMirror for size).
- **react-markdown** + `shiki`/`rehype-highlight` — chat markdown + code blocks.
- **@tanstack/react-virtual** — virtualized chat/list rendering.
- **lucide-react** (or Codex's icon set replicated) — icons.
- **zod** — runtime validation at the IPC edge on the JS side.

Adding a dependency requires: a one-line justification in the PR, a bundle-size
check, and (for anything heavy) a note here.

## Rust crates (core list)

`tauri`, `tokio`, `serde`/`serde_json`, `sqlx` (sqlite, runtime-tokio),
`keyring`, `reqwest` (json, stream), `eventsource-stream`/manual SSE, `git2`,
`portable-pty`, `ts-rs`, `tracing`, `thiserror`, `anyhow` (boundaries only),
`uuid`, `time`, `notify` (file watching for review panel), `which`.

## Versioning & MSRV

- Rust: track stable; MSRV documented in `src-tauri/Cargo.toml` (≥ 1.77).
- Node: ≥ 20 (CI matrix includes 20 and 24).
- Pin Tauri 2.x minor in `Cargo.toml`/`package.json`; upgrade deliberately.
