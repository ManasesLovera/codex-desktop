# Spec — Harness Permissions & Guardrails

**Status:** Draft · **Owner:** core · **Related:** `docs/06-security-guardrails.md` (model), `agents.md`, `plan-mode.md`, `terminal.md`, `mcp.md`

## Overview

The user-facing configuration and runtime behavior of the harness: permission
profiles, approval modes, and the live approval flow that governs what agents and
model-driven tools may do. This spec is the **feature** view; the **model** is in
`docs/06-security-guardrails.md`.

## User stories

- I choose a permission profile (Read-only, Suggest, Auto-edit, Agent(PR),
  Full-auto) per chat/agent and see it indicated at all times.
- When an agent wants to do something gated, I get an approve/deny prompt.
- I create custom profiles (allow/deny lists, approval mode, sandbox).
- I trust that no privileged action bypasses my chosen profile.

## UI/UX

- **Harness chip** in the composer/status bar showing the active profile + a
  permission icon; click to change.
- Settings → **Permissions**: list/edit profiles; built-ins shown, custom ones
  creatable. Editor for fs allow/deny, shell mode + allow/deny, network policy,
  git push/PR toggles, sandbox kind, approval mode, step/time budgets.
- **Approval prompt** UI: shows the exact action (command, diff, network target,
  paths), Approve / Deny / Always-allow-this-kind (scoped to the run).

## Behavior / functional requirements

- Built-in profiles per the matrix in `docs/06-security-guardrails.md` §2.
- `policy_json` schema (fs/shell/network/git/sandbox/approval_mode/budgets) is the
  contract; validated on save.
- Runtime: `harness::evaluate(profile, action) -> Allow | Confirm | Deny`,
  enforced **in Rust at the execution boundary**. The UI never enforces.
- Confirm → emit `*:approval_req`; await `*_approve` decision; timeout = deny.
- "Always allow this kind" applies only within the current run.
- Switching to a more permissive profile is an explicit, logged user action.
- Hard deny-list (secrets, `.git/config`, destructive shell) always wins.

## IPC

`harness_profiles`, `harness_profile_create`, `harness_profile_update`,
`harness_profile_delete`, `harness_set_default`. Approvals via per-domain
`*_approve` commands + `*:approval_req` events. See `docs/05-ipc-contract.md`.

## Data model

`harness_profile` table (`policy_json`). Agent/chat reference a profile. See
`docs/04-data-model.md`.

## Edge cases

- Missing sandbox tool (`bwrap`) → degrade to confirm mode + deny-list, warn.
- Profile deleted while in use → fall back to default; running work keeps its
  snapshotted policy.
- Approval timeout → deny + log.
- Attempts to escape confinement (path traversal/symlink) → hard deny + log.

## Tests

- **Unit:** policy evaluation matrix (allow/confirm/deny) across fs/shell/net/git;
  deny-list precedence; path-escape rejection; budget enforcement.
- **Integration:** agent action gated → approval_req emitted → approve resumes /
  deny aborts; profile switch is logged; sandbox fallback path.
- **Security:** fuzz shell/path inputs to assert no bypass; assert secrets never
  reachable under any profile including Full-auto.
- **E2E:** run an agent under Auto-edit, get an approval prompt, approve, and
  verify the write occurred only in the worktree.

## Acceptance criteria

- [ ] All five built-in profiles behave per the matrix.
- [ ] Enforcement is in Rust; UI cannot bypass it.
- [ ] Approval flow blocks gated actions until resolved (timeout = deny).
- [ ] Hard deny-list wins even under Full-auto; no confinement escape.
