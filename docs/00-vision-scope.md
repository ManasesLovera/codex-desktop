# 00 — Vision & Scope

## Vision

Deliver a **pixel-perfect, full-feature clone of OpenAI's Codex Desktop** that
runs natively on Linux with a fraction of the resource cost of the Electron
build. Users should be unable to tell our UI apart from the official app, while
power users notice it is dramatically lighter and faster.

## The problem we're solving

The existing Linux option (`ilysenko/codex-desktop-linux`) repackages OpenAI's
Electron/macOS build. It works, but:

- Each window carries a full Chromium runtime.
- Idle RAM is typically **300–600 MB**; multiple chats/agents compound this.
- Cold start is slow; battery/CPU cost is high.
- It is gated by upstream and hard to extend for Linux-native workflows.

## Our approach

Rebuild from scratch on **Tauri 2 + Rust**, rendering the UI in the OS-native
WebView (WebKitGTK). Move every privileged operation (FS, git, processes,
network, secrets) into a Rust core. Reuse the OS browser engine instead of
shipping one.

## Performance targets (hard goals)

| Metric | Target | Electron baseline |
|--------|--------|-------------------|
| Idle RAM (1 window, 1 chat) | **≤ 150 MB** | 300–600 MB |
| Idle RAM per extra chat tab | **≤ 15 MB** | 80–150 MB |
| Cold start to interactive | **≤ 1.5 s** | 3–6 s |
| Idle CPU | **≈ 0%** (no busy timers) | 1–5% |
| Release bundle size | **≤ 20 MB** | 120–250 MB |
| Streaming token render | 60 fps, no main-thread jank | varies |

These are tracked in CI via a memory/startup smoke benchmark (`docs/08-ci-cd.md`).

## In scope (v1)

All features in `CLAUDE.md` §4, each with its own spec:

Projects · Workspaces · Chats · Model switching · Plan mode · Terminal ·
Worktrees · Agents (auto worktree + PR) · Custom MCP servers · Plugins · Sites ·
Automations · Remote Mobile · Usage · Profile & Settings · Pinned · File upload ·
Side panel (browser/chat/terminal/review) · Harness permissions & guardrails ·
Auth (ChatGPT OAuth **and** OpenAI API key).

## Out of scope (v1)

- macOS / Windows builds (architecture stays portable, but only Linux is shipped/tested).
- Re-implementing OpenAI's *server-gated* features (model rollouts, account
  entitlements) — we consume what the account is entitled to.
- A hosted backend of our own. The app is a thin, local client to OpenAI's APIs
  plus local tools.
- Telemetry/analytics beyond opt-in crash reporting.

## Definition of done (product level)

1. UI is visually indistinguishable from Codex Desktop at 100%, 125%, 150% scale.
2. Every feature in scope works end-to-end with tests.
3. Performance targets met on a mid-range Linux laptop.
4. CI green: lint, typecheck, unit, integration, e2e, bundle smoke, perf smoke.
5. Reproducible `.deb`/`.rpm`/AppImage artifacts.

## Primary users

- Developers using Codex/Claude agents for coding on Linux.
- Users who want the Codex experience without Electron's overhead.
- Power users running multiple agents/worktrees in parallel.

## Guiding principles

1. **Parity first** — match the real app before adding anything novel.
2. **Lean by default** — every MB and every CPU cycle is justified.
3. **Rust owns trust** — the WebView is a renderer, nothing more.
4. **Spec-driven** — code follows docs; docs stay truthful.
5. **Safe agents** — autonomy is always bounded by guardrails.
