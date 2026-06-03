# Spec — Plan Mode

**Status:** Draft · **Owner:** core · **Related:** `chats.md`, `agents.md`, `permissions-guardrails.md`

## Overview

A mode where the model first produces a **plan** (read-only investigation +
proposed steps) for user review/approval before any changes are made — matching
Codex's plan mode.

## User stories

- I toggle plan mode in the composer before asking for a change.
- The model investigates (read-only) and presents a structured plan.
- I approve, edit, or reject the plan; on approval it proceeds to execute.

## UI/UX

- Plan toggle in composer; active state clearly indicated.
- Plan rendered as a **plan card**: numbered steps, files to touch, risks,
  open questions. Approve / Edit / Reject controls.
- While planning, the harness is forced to a read-only profile (no writes/shell
  side effects) regardless of the chat's profile.

## Behavior / functional requirements

- `plan_start({chat_id, goal})` runs the model under a **read-only** harness
  profile; emits `plan:{chat_id}:draft` then `:updated` as it refines.
- The plan is a structured object (steps, target files, rationale), persisted as
  a message of a `plan` content type.
- `plan_approve` transitions to execution: subsequent actions use the chat's real
  harness profile (or hand off to an agent run — see `agents.md`).
- `plan_reject({feedback})` returns to planning with the feedback.

## IPC

`plan_start`, `plan_approve`, `plan_reject`. Events `plan:{chat_id}:draft|updated`.

## Data model

Plan stored as a `message` with `content_json` of kind `plan`; approval recorded.
See `docs/04-data-model.md`.

## Edge cases

- Model tries to write during planning → blocked by read-only harness, logged.
- Plan edited by user before approval → execution follows the edited plan.
- Large/multi-phase plans → collapsible steps; can approve phase-by-phase.

## Tests

- **Unit:** plan structure parsing, read-only enforcement during planning.
- **Integration:** plan_start→draft→approve→execute path with mock provider;
  assert no writes occur before approval.
- **E2E:** toggle plan mode, receive plan card, edit, approve, see execution.

## Acceptance criteria

- [ ] No filesystem writes happen before plan approval.
- [ ] Plan is structured, editable, and persisted.
- [ ] Approval correctly transitions to the real harness profile.
