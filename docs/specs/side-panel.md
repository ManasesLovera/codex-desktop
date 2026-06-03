# Spec — Side Panel (Browser / Chat / Terminal / Review)

**Status:** Draft · **Owner:** core · **Related:** `terminal.md`, `sites.md`, `worktrees.md`, `chats.md`, `agents.md`

## Overview

A dockable, resizable right-hand panel hosting four tabbed surfaces, matching
Codex's modern side panel:

1. **Browser** — sandboxed web view for previews/docs/sites.
2. **Chat** — a secondary chat alongside the main work area.
3. **Terminal** — an integrated PTY (`terminal.md`).
4. **Review changes** — diff viewer for the current worktree/agent run.

## User stories

- I open the side panel and preview a running site in the browser tab.
- I keep a side chat open while reviewing an agent's diff.
- I run a terminal in the panel without leaving the main view.
- I review and stage/approve changes per file/hunk.

## UI/UX

- Right-docked, collapsible, resizable (width persisted per project/workspace).
- Tab bar across the four surfaces; remembers last-open tab.
- **Browser**: address bar (restricted), back/forward/reload, loads loopback
  site URLs or allow-listed docs; runs in a sandboxed WebView.
- **Chat**: full chat UI (`chats.md`) in compact layout.
- **Terminal**: xterm.js (`terminal.md`).
- **Review changes**: file tree + diff (CodeMirror/Monaco), per-file/per-hunk,
  stage/approve actions feeding agent approvals or git staging.

## Behavior / functional requirements

- Panel state (open, active tab, width) persisted in settings, scoped per
  project/workspace.
- **Browser** tab is a separate sandboxed WebView/webview (no Node, strict CSP,
  navigation restricted to loopback/allow-list). Used by `sites.md`.
- **Review changes** consumes `worktree_diff`/agent `:diff` events; staging maps
  to git index ops or agent approval decisions.
- Each surface lazily mounts on first open to keep memory low (efficiency goal).

## Security

- Browser tab is sandboxed and navigation-restricted; cannot reach the app's IPC.
- Review/staging actions go through Rust git ops / harness approvals — the panel
  is a view, not an authority.

## IPC

Reuses domain commands: `site_*` (browser targets), `pty_*` (terminal),
`chat_*` (side chat), `worktree_diff`/`agent_*` (review). Panel layout via
`settings_*`.

## Edge cases

- Resizing/collapse persistence across restarts.
- Browser navigation to disallowed URL → blocked with notice.
- Large diffs → virtualized rendering, lazy hunk loading.
- Switching project/worktree updates review target.

## Tests

- **Unit:** layout persistence, diff model mapping, navigation allow-list.
- **Integration:** review panel reflects a worktree diff; staging updates git
  index (temp repo); side terminal/chat mount lazily.
- **E2E:** open panel, switch all four tabs, preview a site, review a diff and
  stage a hunk.

## Acceptance criteria

- [ ] All four surfaces work and match Codex's layout/behavior.
- [ ] Browser is sandboxed and navigation-restricted.
- [ ] Surfaces mount lazily; panel state persists.
- [ ] Review staging maps correctly to git/agent approvals.
