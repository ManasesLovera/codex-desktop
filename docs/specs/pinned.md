# Spec — Pinned

**Status:** Draft · **Owner:** core · **Related:** `chats.md`, `projects.md`, `agents.md`, `sites.md`

## Overview

Pin frequently-used items (chats, projects, agent runs, sites, automations) to a
**Pinned** section at the top of the sidebar for quick access, with manual
ordering — matching Codex.

## User stories

- I pin a chat/project so it stays at the top.
- I reorder pinned items by dragging.
- I unpin items I no longer need.

## UI/UX

- **Pinned** section at the top of the left sidebar.
- Pin/unpin via context menu or a pin icon on hover.
- Drag-to-reorder; order persists.
- Each pinned item shows its type icon + live status where relevant.

## Behavior / functional requirements

- `pinned_add({target_kind, target_id})` inserts at end; `pinned_remove({id})`.
- `pinned_reorder({order})` persists the new positions.
- Polymorphic targets (`chat`/`project`/`agent_run`/`site`/`automation`);
  resolve target metadata for display; tolerate deleted targets (auto-remove
  stale pins).
- Pinned items are workspace-scoped.

## IPC

`pinned_list`, `pinned_add`, `pinned_remove`, `pinned_reorder`. See
`docs/05-ipc-contract.md`.

## Data model

`pinned` table (polymorphic `target_kind`/`target_id`, `position`). See
`docs/04-data-model.md`.

## Edge cases

- Target deleted → pin auto-removed on next list.
- Duplicate pin → no-op / focus existing.
- Reorder race → last-write-wins on positions.

## Tests

- **Unit:** ordering/position math, stale-pin pruning, polymorphic resolution.
- **Integration:** pin/unpin/reorder across target kinds; workspace scoping.
- **E2E:** pin a chat, reorder, unpin; verify persistence.

## Acceptance criteria

- [ ] Pin/unpin/reorder works for all target kinds.
- [ ] Order persists; stale pins auto-removed.
- [ ] Workspace-scoped.
