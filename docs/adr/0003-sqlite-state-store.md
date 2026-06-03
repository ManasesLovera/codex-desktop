# ADR-0003: Use SQLite (via sqlx) for local state

**Status:** Accepted
**Date:** 2026-06-03
**Deciders:** Project lead

## Context

We persist workspaces, projects, chats/messages, agent runs/events, worktrees,
automations, MCP servers, plugins, sites, pinned items, harness profiles, and
usage snapshots (`docs/04-data-model.md`). The data is relational and queried by
scope (workspace/project) with ordering and history. It must be efficient,
robust to crashes, and easy to back up/inspect.

## Decision

Use **SQLite** as a single-file database accessed from Rust via **`sqlx`**
(sqlite + tokio runtime), with forward-only SQL migrations.

## Options Considered

### Option A: SQLite + sqlx (chosen)
| Dimension | Assessment |
|-----------|------------|
| Fit for relational data | Excellent |
| Query power | Excellent (SQL, joins, indices) |
| Crash safety | Excellent (WAL, transactions) |
| Footprint | Tiny, embedded |
| Tooling | Inspect with any SQLite client |
| Compile-time checks | Yes (sqlx macros) |

**Pros:** Natural fit; transactions; powerful queries; easy backup; great Rust
support; low overhead.
**Cons:** Schema migrations to manage; not ideal for huge blobs (we store files
on disk, not in DB).

### Option B: Embedded KV (sled / RocksDB)
**Pros:** Simple writes; fast.
**Cons:** No relational queries/joins; we'd hand-roll indexing and consistency;
harder to inspect.

### Option C: JSON files
**Pros:** Trivial to start.
**Cons:** No transactions; poor for concurrent writes/queries; corruption risk;
doesn't scale to chats/history.

## Trade-off Analysis

The data is inherently relational and history-heavy; SQL is the right tool. sqlx
adds compile-time-checked queries, reducing a class of runtime bugs. The
migration burden is modest and standard. KV/JSON would push complexity into app
code.

## Consequences

- **Easier:** queries, scoping, history, backups, integrity.
- **Harder:** must maintain forward-only migrations; large binaries go to the
  filesystem (attachments under app data dir), referenced by path.
- **Revisit if:** we need multi-device sync (would add a sync layer, not replace
  SQLite).

## Action Items

1. [ ] Add `migrations/` with the schema from `docs/04-data-model.md`.
2. [ ] Wire `sqlx::migrate!` at startup inside a transaction.
3. [ ] Store attachments on disk; keep only references in DB.
