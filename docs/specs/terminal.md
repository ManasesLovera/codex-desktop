# Spec — Terminal

**Status:** Draft · **Owner:** core · **Related:** `side-panel.md`, `permissions-guardrails.md`, `worktrees.md`

## Overview

An integrated terminal (PTY) rendered with xterm.js, backed by a real PTY in
Rust (`portable-pty`). Available in the side panel and as a full view.

## User stories

- I open a terminal in the current project/worktree directory.
- I run commands interactively with full TTY behavior (colors, resize, signals).
- Multiple terminals can run concurrently; they close cleanly.

## UI/UX

- xterm.js view with theme matching Codex; fit-to-container resize.
- Tab per terminal; cwd label; new/close controls.
- Default cwd = active project root or selected worktree.

## Behavior / functional requirements

- `pty_open({cwd, shell?, cols, rows})` spawns a PTY (user's `$SHELL` default),
  returns `{pty_id}`; streams output via `pty:{pty_id}:data`.
- `pty_write({pty_id, data})` forwards keystrokes; `pty_resize` on container
  resize; `pty_close` terminates.
- PTYs are tracked in a registry and killed on chat/workspace/window close.
- Emits `pty:{pty_id}:exit` with exit code.
- Optional integration with worktrees: opening a terminal "in worktree" sets cwd
  accordingly.

## Security

- The *interactive user* terminal runs with the user's own privileges (it's their
  shell). **Agent/model-driven** shell execution is separate and always goes
  through the harness (`docs/06-security-guardrails.md`) — do not conflate the two.
- No PTY is exposed to the WebView directly; only event streams.

## IPC

`pty_open`, `pty_write`, `pty_resize`, `pty_close`. Events `pty:{pty_id}:data|exit`.

## Edge cases

- Shell exits → mark closed, show exit code, allow restart.
- High-throughput output → backpressure/chunking to keep UI responsive.
- Window close with running processes → graceful SIGTERM then SIGKILL.
- Resize race conditions → debounce + last-write-wins.

## Tests

- **Unit:** registry lifecycle, resize handling.
- **Integration:** open PTY, run `echo`, assert output stream; close and assert
  process reaped; concurrent PTYs isolated.
- **E2E:** open terminal in side panel, run a command, see output, resize, close.

## Acceptance criteria

- [ ] Full interactive TTY behavior (colors, resize, signals).
- [ ] No orphan processes after close.
- [ ] Multiple concurrent terminals isolated.
