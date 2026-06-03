# Spec — Agents (auto worktree + PR)

**Status:** Draft · **Owner:** core · **Related:** `worktrees.md`, `permissions-guardrails.md`, `mcp.md`, `plan-mode.md`, `chats.md`

## Overview

Run one or more autonomous coding agents (Claude, Codex, or custom) that each:

1. Create their **own worktree** (`../worktrees/<project>/<feature>`),
2. Do the work under a harness profile (with approval gates),
3. Commit on a **new branch**,
4. **Push to the same repo** and **open a PR**.

Multiple agents can run in parallel, each isolated in its own worktree/branch.

## User stories

- I give a task ("add X", "fix Y"); an agent spins up a worktree and works.
- I launch several agents at once on different tasks; each opens its own PR.
- I watch live progress (steps, tool calls, diffs) and approve risky actions.
- I can cancel an agent; its worktree/branch is cleaned up or kept per choice.

## UI/UX

- "Start agent" from project/chat: task input, agent kind, harness profile,
  toggles for auto-worktree (default on) and auto-PR.
- Agents sidebar list: status dots (queued/running/needs-approval/done/failed).
- Agent run detail view: live timeline (steps, tool calls, diffs), approval
  prompts, links to worktree + PR. Review-changes side panel shows the diff.

## Behavior / functional requirements

### Orchestration

- `agent_start({project_id, task, agent_kind, harness_profile_id, auto_worktree, auto_pr})`
  → `{run_id}`; creates `agent_run` row (`status=queued`).
- Orchestrator (Tokio task):
  1. If `auto_worktree`: create worktree + branch (`worktree.md`), named from a
     slug of the task.
  2. Drive the agent loop: model proposes actions → harness evaluates →
     execute/approve/deny → append `agent_event`.
  3. Stream `agent:{run_id}:progress|tool_call|approval_req|diff`.
  4. On success: commit, push branch to `origin`, open PR via `gh`/git host API;
     store `pr_url`; emit `:pr` then `:done`.
- Multiple runs execute concurrently, each fully isolated (own worktree, branch,
  child processes, harness context).

### Agent kinds

- `claude` / `codex`: drive the respective CLI/agent harness if installed, or the
  in-app provider loop. Pluggable via a `AgentBackend` trait.
- Custom kinds contributed by plugins (`plugins.md`).

### PR automation

- Push uses the project's `origin` remote. PR opened via `gh` CLI if available,
  else the git host REST API (token from keyring). PR title/body generated from
  the task + change summary. Never force-push; never push to the default branch.

### Approval & guardrails

- All actions pass the run's harness profile (`permissions-guardrails.md`).
  Risky actions (writes outside worktree, network, push/PR when profile gates
  them) emit `approval_req`; resolved via `agent_approve`.

## IPC

`agent_start`, `agent_get`, `agent_list`, `agent_cancel`, `agent_approve`,
`agent_open_pr`. Events `agent:{run_id}:*`. See `docs/05-ipc-contract.md`.

## Data model

`agent_run`, `agent_event`; FK to `worktree`. See `docs/04-data-model.md`.

## Edge cases

- No remote / no PR permission → complete locally, surface "PR skipped" with the
  branch ready to push.
- Agent gets stuck / loops → step/time budget in profile; auto-pause for approval.
- Conflicting branches → unique slug + suffix; rebase or report conflict.
- Cancel mid-run → kill child processes, leave worktree per user choice
  (keep/remove), mark `cancelled`.
- Parallel agents touching shared resources → isolated by worktree; DB writes
  serialized.

## Tests

- **Unit:** orchestrator state machine, slug/branch naming, PR body generation,
  budget enforcement.
- **Integration:** against a temp git repo with a fake remote — full run creates
  worktree, commits, pushes branch, "opens PR" (mock host API); approval gate
  pauses/resumes; cancel cleans up child processes.
- **Integration:** two agents in parallel produce two isolated branches/PRs.
- **E2E:** start agent from UI, watch timeline, approve an action, see PR link.

## Acceptance criteria

- [ ] Agent creates worktree at the required path and works in isolation.
- [ ] Commits to a new branch, pushes to same repo, opens a PR.
- [ ] Multiple agents run in parallel without interference.
- [ ] All actions respect the harness profile and approval gates.
- [ ] Cancel leaves no orphan processes.
