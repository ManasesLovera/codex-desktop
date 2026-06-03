# Spec — Automations

**Status:** Draft · **Owner:** core · **Related:** `agents.md`, `chats.md`, `permissions-guardrails.md`

## Overview

Scheduled or triggered tasks that run a prompt, an agent, or a command without
manual initiation — matching Codex's Automations.

## User stories

- I create an automation that runs a prompt/agent on a schedule (e.g. nightly).
- I trigger an automation manually or on an event.
- I see run history and logs; I can enable/disable it.

## UI/UX

- **Automations** sidebar section: list (name, trigger, last run, enabled).
- Editor: name, trigger (schedule via cron-like picker / manual / event), action
  (prompt, agent task + harness profile, or shell command), target project.
- Run history with status + log viewer.

## Behavior / functional requirements

- `automation_create({name, trigger_kind, trigger_config, action, …})`.
- A Rust scheduler (Tokio + a cron parser) fires `schedule` automations; emits
  `automation:{id}:run` and records `automation_run` rows with status + log path.
- Actions:
  - `prompt` → creates a chat and sends the prompt.
  - `agent` → starts an agent run (`agents.md`) with a harness profile.
  - `command` → runs a shell command under the harness.
- `automation_run_now({id})` for manual trigger; `automation_runs({id})` for
  history.
- Scheduler only runs while the app is open (v1); document this clearly. (Future:
  background service.)

## Security

- Automated agent/command actions run under an explicit harness profile — no
  silent elevation. Destructive defaults are conservative.
- Scheduled runs that need approval pause and notify rather than auto-approving.

## IPC

`automation_list`, `automation_create`, `automation_update`,
`automation_delete`, `automation_run_now`, `automation_runs`. Event
`automation:{id}:run`.

## Data model

`automation`, `automation_run`. See `docs/04-data-model.md`.

## Edge cases

- App closed at scheduled time → run skipped (v1); show "missed" in history.
- Overlapping runs → configurable: skip / queue / allow concurrent.
- Failing action → status `failed` with log; optional retry policy.
- Timezone/DST handling for schedules.

## Tests

- **Unit:** cron parsing/next-fire computation, overlap policy, action dispatch.
- **Integration:** schedule fires (with a fast/fake clock) → action runs → run
  recorded; manual trigger; failure path.
- **E2E:** create a manual automation, run it, see it in history with logs.

## Acceptance criteria

- [ ] Schedule/manual/event triggers all work.
- [ ] All three action types execute and are logged.
- [ ] Automated privileged actions respect harness profiles.
