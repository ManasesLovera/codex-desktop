# Spec — Projects

**Status:** Draft · **Owner:** core · **Related:** `worktrees.md`, `agents.md`, `sites.md`, `workspaces.md`

## Overview

A **Project** points at a local repository/directory and is the unit work is
scoped to: chats, worktrees, agent runs, and sites attach to a project.

## User stories

- I add a project by picking a folder; the app detects git and the default branch.
- I see my projects in the sidebar with recents ordering.
- Opening a project scopes the workspace to it (chats, worktrees, terminal cwd).
- I can remove a project without deleting files on disk.

## UI/UX

- Sidebar **Projects** section: list with repo name, branch, status dot.
- Each project expands to **Worktrees**, **Agents**, **Sites** sub-items.
- "Add project" → native folder picker (Rust dialog) → detect → confirm name.
- Project view (main area) shows overview: repo info, recent chats/agents,
  quick actions (new chat, start agent, open terminal).

## Behavior / functional requirements

- `project_add({path})`: canonicalize path, verify it exists, run
  `project_detect_repo` (git presence, default branch, remote URL), insert row.
- `project_open({id})`: set as active project; update `last_opened_at`; load
  scoped lists.
- `project_remove`: delete the row + scoped soft-deletes; **never** touch the
  working directory on disk. Warn if active worktrees/agents exist.
- Repo detection: `git`/non-git; for git, read default branch + remote for PR
  automation (used by `agents.md`).

## IPC

`project_list`, `project_add`, `project_remove`, `project_open`,
`project_detect_repo`. See `docs/05-ipc-contract.md`.

## Data model

`project` table; FK to `workspace`. See `docs/04-data-model.md`.

## Edge cases

- Folder is not a git repo → allowed, but worktree/agent-PR features disabled with
  a hint.
- Path moved/deleted after adding → mark `missing`, offer relocate/remove.
- Duplicate add of same path → focus existing project.
- Monorepo / nested repos → project root is the chosen folder; detect nearest
  `.git`.

## Tests

- **Unit:** path canonicalization, repo detection (git/non-git/nested), recents
  ordering.
- **Integration:** add→open→remove lifecycle against temp git repos; missing-path
  handling.
- **E2E:** add project via picker (mocked dialog), see it in sidebar, open it,
  remove it without file loss (assert files still on disk).

## Acceptance criteria

- [ ] Add/open/remove works; files never deleted on remove.
- [ ] Git metadata detected and surfaced.
- [ ] Scoping: opening a project filters chats/worktrees/agents/sites correctly.
