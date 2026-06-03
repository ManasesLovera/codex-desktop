# Spec — Usage Check

**Status:** Draft · **Owner:** core · **Related:** `auth.md`, `model-switching.md`, `chats.md`

## Overview

Show token/request usage and (for API keys) cost estimates, per account and over
time — matching Codex's usage view.

## User stories

- I see my usage (tokens in/out, requests, estimated cost) for today/this month.
- Usage is broken down by model and (where possible) by project/chat.
- For ChatGPT plans I see plan limits/remaining where the API exposes it.

## UI/UX

- **Usage** view: summary cards (today / 7d / 30d), a time-series chart, and a
  per-model breakdown table. Quick glance in the titlebar/status bar.
- Cost shown for API-key accounts; plan limits for ChatGPT accounts.

## Behavior / functional requirements

- **Local tally:** every completed request records `tokens_in/out` + request
  count into `usage_snapshot` (source `local_tally`). This always works.
- **API refresh:** `usage_refresh({account_id})` pulls authoritative usage/cost
  from the provider where available (OpenAI usage endpoints for API keys),
  merging into snapshots (source `api`).
- `usage_summary({account_id, range})` aggregates snapshots for the requested
  range and grouping.
- Cost estimate computed from a model price table (configurable, updatable).

## IPC

`usage_summary`, `usage_refresh`. See `docs/05-ipc-contract.md`.

## Data model

`usage_snapshot` (per account/day). See `docs/04-data-model.md`.

## Edge cases

- Provider has no usage API (ChatGPT OAuth) → rely on local tally + any exposed
  plan info; label estimates clearly.
- Price table stale → show "estimate"; allow manual update.
- Timezone boundaries for "today".
- Multiple accounts → per-account isolation.

## Tests

- **Unit:** tally accumulation, range aggregation, cost computation from price
  table.
- **Integration:** completing chats updates snapshots; `usage_refresh` merges
  mock API data without double-counting.
- **E2E:** run a chat, open Usage, see counts increment.

## Acceptance criteria

- [ ] Local tally is always accurate per request.
- [ ] API refresh merges without double counting.
- [ ] Per-account, per-model, per-range breakdowns correct.
