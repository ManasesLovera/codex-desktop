# Spec — Worktrees

**Status:** Draft · **Owner:** core · **Related:** `agents.md`, `projects.md`, `side-panel.md` (review), `permissions-guardrails.md`

## Overview

Per-project git worktrees so work (especially agents) happens in isolation
without disturbing the user's main checkout. **Convention (required):**

```
../worktrees/<project-name>/<feature-or-fix>
```

i.e. a sibling `worktrees/` directory next to the repo, namespaced by project,
then by branch/task slug.

## User stories

- I (or an agent) create a worktree for a feature; it checks out a new branch in
  the conventional path.
- I see all worktrees for a project with status (ahead/behind, dirty).
- I review the diff and remove the worktree when done.

## UI/UX

- Project → **Worktrees** sub-list: branch, path, status dot, created-by
  (user/agent).
- Actions: create, open terminal here, review changes (side panel), remove.
- Create dialog: branch name → slug → preview of resulting path.

## Behavior / functional requirements

- Path resolution: given project `root_path`, compute
  `<root_path>/../worktrees/<project-name>/<slug>` (canonicalized). Create parent
  dirs as needed.
- `worktree_create({project_id, branch, base?})`: `git worktree add` (via `git2`
  or git CLI) on a new branch from `base` (default = repo default branch);
  persist `worktree` row.
- `worktree_status({id})`: ahead/behind vs base, dirty files count.
- `worktree_diff({id})`: structured diff for the review panel.
- `worktree_remove({id, force?})`: `git worktree remove` (force if dirty +
  confirmed), prune, mark row `removed`. Never delete the main checkout.
- Slugging: lowercase, hyphenated, filesystem-safe, collision-suffixed.

## Security

- Worktrees are the default **write-confinement** root for agents (see
  `docs/06-security-guardrails.md` §3). Agent writes outside the worktree are
  denied unless the profile allows.

## IPC

`worktree_list`, `worktree_create`, `worktree_remove`, `worktree_status`,
`worktree_diff`. See `docs/05-ipc-contract.md`.

## Data model

`worktree` table; `created_by` distinguishes user vs `agent:{run_id}`. See
`docs/04-data-model.md`.

## Edge cases

- Non-git project → feature disabled with hint.
- Branch already exists → offer checkout existing vs new name.
- Dirty worktree on remove → require `force` + confirmation.
- Path already exists on disk → collision suffix or adopt if it's a valid
  worktree of this repo.
- Repo moved → mark worktrees stale.

## Tests

- **Unit:** path/slug computation incl. the exact `../worktrees/<project>/<feature>`
  convention; collision handling.
- **Integration:** against a temp git repo — create worktree (assert path +
  branch), status, diff, remove; assert main checkout untouched.
- **E2E:** create worktree from UI, review diff in side panel, remove it.

## Acceptance criteria

- [ ] Worktrees always created at `../worktrees/<project-name>/<feature>`.
- [ ] Create/status/diff/remove all work against real git.
- [ ] Main checkout is never modified or deleted.
