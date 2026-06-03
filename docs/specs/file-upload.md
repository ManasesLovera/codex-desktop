# Spec — File Upload

**Status:** Draft · **Owner:** core · **Related:** `chats.md`, `model-switching.md`, `permissions-guardrails.md`

## Overview

Attach files (images, code, docs) to chat messages for the model to use, matching
Codex. Files are staged by the Rust core, not handled in the WebView.

## User stories

- I attach files via picker, drag-and-drop, or paste.
- I see attachment chips with name/size/type and can remove them before sending.
- Image attachments work with vision-capable models; other files are included as
  context per model capability.

## UI/UX

- Attach button in composer; drag-drop overlay; paste-from-clipboard.
- Attachment chips above the input: thumbnail (images), filename, size, remove.
- If the model lacks the needed capability, show a warning (`model-switching.md`).

## Behavior / functional requirements

- `file_stage({chat_id, path})` (native picker/drag gives a path) copies the file
  into the app store (`attachment.storage_path`) and returns an `Attachment`.
- `file_stage_bytes({chat_id, filename, mime, bytes_b64})` for paste/in-memory
  data (e.g. screenshots).
- On `chat_send`, staged attachments are referenced; the provider layer formats
  them per model (image parts for vision, text/extracted content otherwise).
- Size/type limits enforced in Rust; oversized/unsupported rejected with a clear
  error.
- `file_remove({attachment_id})` deletes staged file + row (if unsent).

## Security

- All file handling in Rust; the WebView never reads the filesystem.
- Staged files live under the app data dir; path traversal prevented.
- Attachments included in model context are subject to the same data-handling as
  chats (no secret scanning bypass).

## IPC

`file_stage`, `file_stage_bytes`, `file_remove`. See `docs/05-ipc-contract.md`.

## Data model

`attachment` table. See `docs/04-data-model.md`.

## Edge cases

- Unsupported type / too large → reject with reason.
- Duplicate attachment → allowed; dedupe by hash optional.
- Attaching to a non-capable model → warn; allow switch.
- Cleanup of orphaned staged files (never sent) on chat delete.

## Tests

- **Unit:** type/size validation, path-traversal prevention, provider formatting
  per capability.
- **Integration:** stage from path and from bytes; send with attachment to mock
  provider (assert correct payload shape); remove before send.
- **E2E:** drag-drop an image into composer, see chip, send to a vision model.

## Acceptance criteria

- [ ] Picker, drag-drop, and paste all stage files via Rust.
- [ ] Attachments formatted correctly per model capability.
- [ ] Limits enforced; no FS access from WebView.
