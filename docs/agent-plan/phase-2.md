# Phase 2 — Chats, Model Switching, File Upload, Plan Mode (agent task plan)

**Goal:** real streaming conversations with model switching, attachments, and
plan mode. This is the product's core loop.

Specs: [`chats.md`](../specs/chats.md), [`model-switching.md`](../specs/model-switching.md),
[`file-upload.md`](../specs/file-upload.md), [`plan-mode.md`](../specs/plan-mode.md).
Routing rules: [`../11-agent-automation-guide.md`](../11-agent-automation-guide.md).

> Plan mode needs a read-only harness hook. In this phase implement a **minimal
> read-only enforcement shim** in `core/chats`; the full harness engine lands in
> Phase 4 and replaces the shim.

## Wave plan

```
Wave 1: P2-T1 migration (chat/message/attachment)  ─ MIGRATION
Wave 2 (core, parallel): P2-T2 streaming engine(S)  P2-T3 model switching(A)  P2-T4 file staging(A)
Wave 3: P2-T5 plan mode core(S, depends T2)
Wave 4 (UI, parallel): P2-T6 transcript+composer  P2-T7 model picker UI  P2-T8 attachment chip
Sync: P2-S
```

---

### P2-T1 — Chat schema migration
- Model: **Tier A — Sonnet 4.6**
- Lane: MIGRATION
- Owns: `src-tauri/migrations/0003_*.sql`, chat/message/attachment models in `store/models.rs` (append only)
- Depends on: Phase 1
- Parallel with: none (single MIGRATION writer)
- Context: `docs/04-data-model.md`
- Prompt: "Add migration `0003` for `chat`, `message` (with `parent_id` tree),
  and `attachment` per docs/04-data-model.md, plus indices for chat/message
  lookups. Add model structs (serde+TS). No logic."
- DoD: migration applies; models compile; bindings regenerate.

### P2-T2 — Chat streaming engine + commands
- Model: **Tier S — Opus 4.8** (async streaming/cancellation correctness; pattern
  reused by agents)
- Lane: RUST-CORE + RUST-CMD (`core/chats.rs`, `commands/chats.rs`)
- Owns: `src-tauri/src/core/chats.rs`, `src-tauri/src/commands/chats.rs`
- Depends on: P2-T1, P1-T2 (LlmProvider)
- Parallel with: P2-T3, P2-T4
- Context: `docs/specs/chats.md`, `docs/05-ipc-contract.md` (chat events), `docs/01-architecture.md` (streaming pattern)
- Prompt: "Implement chats per spec: create/list/get/rename/archive/delete, and
  `chat_send` returning `{stream_id}` that spawns a Tokio task calling
  LlmProvider.chat_stream and emits `chat:{stream_id}:delta|tool_call|done|error`.
  Persist messages incrementally; finalize usage on done. `chat_cancel` drops the
  task and kills child tools. `chat_edit_message` branches via parent_id.
  Integration tests against a mock SSE provider: stream→done, cancel, edit-rerun."
- DoD: streaming + cancel + edit-branch work; usage recorded on done; tests pass.

### P2-T3 — Model switching core + commands
- Model: **Tier A — Sonnet 4.6**
- Lane: RUST-CORE + RUST-CMD (`core/model.rs` consumer, `commands/model.rs`)
- Owns: `src-tauri/src/commands/model.rs`, model-capability logic in `providers/model.rs` (extend, coordinate via dep on P1-T2)
- Depends on: P1-T2
- Parallel with: P2-T2, P2-T4
- Context: `docs/specs/model-switching.md`
- Prompt: "Implement `model_list`, `model_set_default`, `model_capabilities` per
  spec. Entitled models come from the active provider; capabilities (context
  window, vision, tools, reasoning) drive UI affordances. Per-chat persistence;
  fallback when a model is unavailable. Unit tests for capability gating + default
  resolution."
- DoD: model list reflects account; per-chat persistence; capability gating
  logic tested.

### P2-T4 — File staging core + commands
- Model: **Tier A — Sonnet 4.6**
- Lane: RUST-CORE + RUST-CMD (`core/attachments.rs`, `commands/files.rs`)
- Owns: `src-tauri/src/core/attachments.rs`, `src-tauri/src/commands/files.rs`
- Depends on: P2-T1
- Parallel with: P2-T2, P2-T3
- Context: `docs/specs/file-upload.md`, `docs/06-security-guardrails.md`
- Prompt: "Implement file staging per spec: `file_stage` (from path),
  `file_stage_bytes` (paste/screenshots), `file_remove`. Copy into the app data
  dir; enforce size/type limits; prevent path traversal; format per model
  capability when sent (image parts vs text). All FS handling in Rust. Tests:
  validation, traversal prevention, provider formatting, orphan cleanup."
- DoD: both staging paths work via Rust; limits enforced; no WebView FS access.

### P2-T5 — Plan mode core (read-only shim)
- Model: **Tier S — Opus 4.8** (must guarantee no writes pre-approval)
- Lane: RUST-CORE + RUST-CMD (`core/plan.rs`, `commands/plan.rs`)
- Owns: `src-tauri/src/core/plan.rs`, `src-tauri/src/commands/plan.rs`
- Depends on: P2-T2
- Parallel with: P2-T3, P2-T4 (different files)
- Context: `docs/specs/plan-mode.md`, `docs/specs/permissions-guardrails.md`
- Prompt: "Implement plan mode per spec: `plan_start` runs the model under a
  MINIMAL read-only enforcement shim (block any fs write/tool side-effect during
  planning), emits `plan:{chat_id}:draft|updated`; plan stored as a `plan`
  content message; `plan_approve` transitions to normal execution;
  `plan_reject(feedback)` loops. Add a TODO marker to swap the shim for the
  Phase-4 harness engine. Integration test: assert NO fs writes occur before
  approval."
- DoD: structured plan produced; zero writes before approval (tested); approve/
  reject transitions work.

### P2-T6 — Transcript + composer UI
- Model: **Tier A — Sonnet 4.6** (complex: virtualization, streaming, parity)
- Lane: UI-FEATURE (`src/features/chats/**`)
- Owns: `src/features/chats/**`
- Depends on: P2-T2 (events/commands)
- Parallel with: P2-T7, P2-T8
- Context: `docs/specs/chats.md`, `docs/10-ui-ux-layout.md`, `docs/00-vision-scope.md` (perf)
- Prompt: "Build the chat view matching Codex: virtualized transcript
  (@tanstack/react-virtual), user/assistant bubbles, collapsible tool-call cards,
  plan cards, code blocks (copy+highlight), streaming cursor; composer with
  send/stop, slash/@ affordances. Apply streamed deltas at most once per frame
  (batch tokens) to hold 60fps. Use generated types + lib/ipc events. Component
  tests with mocked streams."
- DoD: smooth streaming (no jank), stop works, parity at all scales; tests pass.

### P2-T7 — Model picker UI
- Model: **Tier B — Gemini 3.5 Flash**
- Lane: UI-FEATURE (`src/features/model-switching/**`)
- Owns: `src/features/model-switching/**`
- Depends on: P2-T3
- Parallel with: P2-T6, P2-T8
- Context: `docs/specs/model-switching.md`, `docs/10-ui-ux-layout.md`
- Prompt: "Build the model switcher dropdown (composer + status bar) matching
  Codex: name, capability tags, context size, reasoning-effort selector where
  supported. Wire to `model_*`. Disable/warn on capability mismatch. Tests with
  mocked IPC."
- DoD: switch persists per chat; affordances adapt to capabilities.

### P2-T8 — Attachment chip + drag/drop/paste UI
- Model: **Tier C — DeepSeek v4 Flash** (free; small, well-bounded UI)
- Lane: UI-FEATURE (`src/features/file-upload/**`)
- Owns: `src/features/file-upload/**`
- Depends on: P2-T4
- Parallel with: P2-T6, P2-T7
- Context: `docs/specs/file-upload.md`
- Prompt: "Build attachment chips + drag-drop overlay + paste handler in the
  composer area. On file selection call `file_stage`/`file_stage_bytes`; show
  thumbnail (images)/name/size/remove. Warn when the active model lacks the
  capability. Keep it small; no FS access from JS — paths/bytes go to Rust. Basic
  component test."
- DoD: drag-drop/paste/picker all stage via Rust; chips render; remove works.

---

## Phase 2 sync step (P2-S)
- Model: **Tier S — Opus 4.8** (Integrator); Tier S reviews P2-T2 and P2-T5.
- Merge order: T1 → T2,T3,T4 → T5 → T6,T7,T8. Run full CI + perf-smoke under
  streaming load + visual regression for the chat view.
- Exit: conversations stream smoothly; attachments + model switch + plan mode
  work; perf targets hold. (Roadmap Phase 2 exit.)
