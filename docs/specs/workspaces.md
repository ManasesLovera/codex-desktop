# Spec — Workspaces

**Status:** Draft · **Owner:** core · **Related:** `auth.md`, `projects.md`, `profile-settings.md`

## Overview

A **Workspace** is the top-level container grouping projects, the active account,
MCP servers, plugins, automations, harness profiles, and settings. Users switch
between workspaces (e.g. "Personal", "Work").

## User stories

- I create multiple workspaces and switch between them quickly.
- Each workspace remembers its own account, projects, MCP servers, and settings.
- Switching workspaces re-scopes the entire UI.

## UI/UX

- Workspace switcher in the titlebar (and command palette).
- Switching is instant; UI re-scopes lists without full reload.
- "Create workspace" dialog: name + choose/sign-in account.

## Behavior / functional requirements

- `workspace_switch({id})`: set active workspace in `AppState`, emit
  `app:workspace_changed`; all scoped queries use the active id.
- Each workspace references one active `account_id` but accounts can be shared.
- Workspace-scoped settings override global settings (`settings_json`).
- Deleting a workspace soft-deletes scoped content after confirmation; the last
  remaining workspace cannot be deleted.

## IPC

`workspace_list`, `workspace_create`, `workspace_update`, `workspace_delete`,
`workspace_switch`, `workspace_active`. Event: `app:workspace_changed`.

## Data model

`workspace` table; nearly all other tables carry `workspace_id`. See
`docs/04-data-model.md`.

## Edge cases

- First run auto-creates a default workspace.
- Switching while an agent/stream runs: streams are workspace-scoped and paused/
  hidden, not killed; resume on switch back.
- Deleting active workspace → switch to another first.

## Tests

- **Unit:** scoping helper always injects `workspace_id`; default-workspace
  bootstrap.
- **Integration:** create/switch/delete; verify cross-workspace isolation (a
  chat in WS A never appears in WS B).
- **E2E:** create second workspace, switch, confirm sidebar re-scopes, switch
  back.

## Acceptance criteria

- [ ] Full isolation between workspaces.
- [ ] Instant switch with correct re-scoping.
- [ ] Cannot delete the last workspace.
