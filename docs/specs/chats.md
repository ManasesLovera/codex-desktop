# Spec — Chats

**Status:** Draft · **Owner:** core · **Related:** `model-switching.md`, `plan-mode.md`, `file-upload.md`, `agents.md`, `mcp.md`

## Overview

Conversations with the model. Streaming responses, rich content (text, code,
tool calls, diffs, attachments), message editing/branching, and persistence.

## User stories

- I start a new chat (optionally scoped to a project) and send a message.
- Responses stream token-by-token; I can stop generation.
- I can attach files, switch the model, and toggle plan mode.
- I can edit a previous message and re-run from there.
- Chats are saved, searchable, renamable, archivable.

## UI/UX

- Transcript: virtualized; user/assistant bubbles; collapsible tool-call cards;
  diff cards; plan cards; code blocks with copy + highlight; streaming cursor.
- Composer: model switcher, plan toggle, attach, harness chip, send/stop.
- Slash commands and @-mentions (files, MCP tools).
- Auto-generated title from first exchange; editable.

## Behavior / functional requirements

- `chat_create({project_id?, model, mode})` → `Chat`.
- `chat_send({chat_id, content, attachments?})` returns `{stream_id}` and starts
  a Tokio task that calls the active provider with streaming; emits
  `chat:{stream_id}:delta|tool_call|done|error`.
- Messages persisted incrementally; on `done`, finalize with usage
  (`tokens_in/out`) → also updates `usage` tally.
- `chat_cancel({stream_id})` drops the task, kills any spawned tools, marks the
  message `cancelled`.
- `chat_edit_message` updates a message and re-runs from that point, creating a
  new branch via `parent_id` (message tree).
- Tool calls (function/MCP) flow through the harness; results appended as `tool`
  messages.

## IPC

`chat_list`, `chat_create`, `chat_get`, `chat_send`, `chat_cancel`,
`chat_edit_message`, `chat_rename`, `chat_archive`, `chat_delete`. Events under
`chat:{stream_id}:*`.

## Data model

`chat`, `message`, `attachment`. Message tree via `parent_id`. See
`docs/04-data-model.md`.

## Performance

- Virtualize transcript; throttle delta application to one DOM update per frame
  (batch tokens).
- Lazy-load older messages; keep memory bounded for long chats.

## Edge cases

- Network drop mid-stream → mark `error`, allow retry/resume.
- Provider rate limit → surface retriable error with backoff.
- Very long output → keep streaming without UI jank; cap stored size sanely.
- Concurrent chats → each has its own stream task; no cross-talk.

## Tests

- **Unit:** message-tree branching, title generation, usage accounting.
- **Integration:** streaming against a mock SSE provider (delta→done), cancel,
  edit-and-rerun, attachment plumbing.
- **E2E:** send message and see streamed reply, stop generation, edit a message,
  rename/archive a chat, reopen and verify persistence.

## Acceptance criteria

- [ ] Streaming renders smoothly at 60fps with no main-thread jank.
- [ ] Cancel stops generation and child tools immediately.
- [ ] Edits branch correctly; history preserved.
- [ ] Usage updated on completion.
