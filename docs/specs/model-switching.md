# Spec — Model Switching

**Status:** Draft · **Owner:** core · **Related:** `auth.md`, `chats.md`, `usage.md`

## Overview

Pick the model per chat/agent from those the active account is entitled to.
Mirrors Codex's model picker (capabilities, context window, reasoning effort).

## User stories

- I switch the model from the composer; the choice persists per chat.
- I see each model's context window and capabilities.
- Available models reflect my account type (ChatGPT plan vs API key).

## UI/UX

- Model switcher dropdown in the composer and status bar.
- Each entry: name, short capability tags (vision, tools, reasoning), context
  size. Grouped/labelled like Codex.
- Reasoning-effort selector where the model supports it.

## Behavior / functional requirements

- `model_list({account_id})` returns entitled models from the active provider
  (OpenAI API `models` endpoint for keys; known plan set for ChatGPT OAuth).
- `model_set_default({chat_id, model})` persists per chat; new chats default to
  the account/workspace default.
- `model_capabilities({model})` returns context window, modality, tool support,
  reasoning support — drives composer affordances (e.g. show attach only if
  vision/file support).
- Switching mid-chat applies to subsequent messages only.

## IPC

`model_list`, `model_set_default`, `model_capabilities`. See
`docs/05-ipc-contract.md`.

## Data model

`chat.model`, `account.default_model`. See `docs/04-data-model.md`.

## Edge cases

- Model deprecated/unavailable for account → fall back to default + notice.
- Capability mismatch (e.g. attachments on a non-vision model) → disable/ warn.
- Offline → use cached model list with staleness note.

## Tests

- **Unit:** capability gating logic, default resolution.
- **Integration:** model list from mock provider per account kind; persistence.
- **E2E:** switch model in composer, verify persisted and reflected in status bar.

## Acceptance criteria

- [ ] Model list matches account entitlements.
- [ ] Per-chat persistence works.
- [ ] Composer affordances adapt to capabilities.
