# ADR-0002: Rust core as the single trust & process boundary

**Status:** Accepted
**Date:** 2026-06-03
**Deciders:** Project lead

## Context

The app runs privileged work: filesystem, git/worktrees, PTYs, child processes,
network/LLM calls, secrets, MCP servers, and autonomous agents. The frontend is
web code in a WebView. We must decide where privilege lives and how the WebView
talks to it (`docs/01-architecture.md`, `docs/06-security-guardrails.md`).

## Decision

- **All privileged operations live in the Rust core** and are exposed only as
  typed `#[tauri::command]`s. The WebView holds **no** ambient FS/shell/network
  access and **never** sees secrets.
- **One OS process** hosts the WebView + Rust + a **Tokio** runtime. Long-running
  work runs as Tokio tasks that **stream via events**; commands return fast.
- A **child-process registry** tracks every spawned process (PTYs, MCP stdio
  servers, agent CLIs, site dev servers) so they are reliably killed on cancel/
  close — no orphans.
- **No polling timers**; UI updates are push-based (events) to keep idle CPU ~0%.

## Options Considered

### Trust placement
**A. Rust owns all privilege; WebView is a pure renderer (chosen)** — strongest
security; aligns with Tauri's capability model.
**B. Expose Tauri fs/shell/http plugins to JS** — convenient but gives the
WebView ambient privilege and a much larger attack surface; rejected.

### Concurrency model
**A. Single process + Tokio tasks + events (chosen)** — lowest overhead; matches
the efficiency goal; simple lifecycle.
**B. Separate worker processes per subsystem** — more isolation but more memory/
IPC overhead; unnecessary for v1 (we sandbox risky *child* processes instead).

### Streaming
**A. Return a handle + emit events (chosen)** — non-blocking, cancellable,
backpressure-friendly for tokens/PTY/agent progress.
**B. Long-lived blocking commands** — blocks the IPC, no partial updates;
rejected.

## Trade-off Analysis

Centralizing privilege in Rust is the foundation of the whole security model
(guardrails, secret hygiene) and costs only the discipline of wrapping each
capability as a command. A single process with Tokio is the most memory-efficient
choice and is sufficient because the genuinely risky code paths (agent shells,
MCP servers) get their own *child*-process sandboxing rather than a blanket
multi-process architecture.

## Consequences

- **Easier:** uniform place to enforce guardrails; no secret leakage to JS;
  clean cancellation; low footprint.
- **Harder:** every new capability needs a command + binding (no shortcut via a
  generic FS/shell bridge); must rigorously track child processes.
- **Revisit if:** a subsystem needs hard process isolation beyond child-process
  sandboxing (introduce a dedicated worker process for just that subsystem).

## Action Items

1. [ ] No fs/shell/http plugins exposed to JS; custom commands only.
2. [ ] `AppState` holds db pool + child-process/stream registries.
3. [ ] Streaming pattern (handle + events + cancel) as the default for long work.
4. [ ] Shutdown hook kills all tracked child processes.
