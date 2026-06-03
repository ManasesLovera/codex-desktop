# Phase 1 — Auth, Workspaces, Projects, Settings (agent task plan)

**Goal:** sign in (ChatGPT OAuth or API key), create a workspace, add a project,
change theme/settings — all persisted. Establishes the provider abstraction.

Specs: [`auth.md`](../specs/auth.md), [`workspaces.md`](../specs/workspaces.md),
[`projects.md`](../specs/projects.md), [`profile-settings.md`](../specs/profile-settings.md).
Routing rules: [`../11-agent-automation-guide.md`](../11-agent-automation-guide.md).

## Wave plan

```
Wave 1 (contract/core, parallel by lane):
  P1-T1 migration (auth/ws/project cols)  ─ MIGRATION (single writer)
  P1-T2 LlmProvider trait + transports    ─ RUST-CORE
Wave 2 (depend on Wave 1, parallel):
  P1-T3 auth(core+cmd+keyring)  P1-T4 workspaces  P1-T5 projects  P1-T6 settings
Wave 3 (UI, parallel, depend on matching cmd task):
  P1-T7 onboarding UI  P1-T8 settings UI  P1-T9 sidebar lists wiring
Sync: P1-S
```

---

### P1-T1 — Extend schema for accounts/workspaces/projects/settings
- Model: **Tier A — Sonnet 4.6**
- Lane: MIGRATION (single writer)
- Owns: `src-tauri/migrations/0002_*.sql`, `src-tauri/src/store/models.rs`
- Depends on: Phase 0
- Parallel with: P1-T2
- Context: `docs/04-data-model.md`
- Prompt: "Add migration `0002` completing `account`, `workspace`, `project`
  columns per docs/04-data-model.md and add `harness_profile` table (needed
  later). Add sqlx model structs deriving serde+TS. No business logic."
- DoD: migration applies cleanly; models compile; bindings regenerate.

### P1-T2 — LlmProvider trait + OpenAI/ChatGPT transports
- Model: **Tier S — Opus 4.8** (sets the provider pattern all chats/agents use)
- Lane: RUST-CORE (`src-tauri/src/providers/**`)
- Owns: `src-tauri/src/providers/{mod.rs,model.rs,openai.rs,chatgpt.rs}`
- Depends on: Phase 0
- Parallel with: P1-T1
- Context: `docs/specs/auth.md`, ADR-0004, `docs/02-tech-stack.md`
- Prompt: "Define a `LlmProvider` trait (list_models, chat_stream returning an
  async token stream, usage) and two impls: `openai` (API key) and `chatgpt`
  (OAuth bearer). Transport only — no UI, no persistence. Use reqwest with SSE
  streaming. Provider is selected by `account.kind`. Add unit tests against a
  mock HTTP server (wiremock) for list_models and a streamed completion."
- DoD: both providers compile; mock-server tests pass; trait is the single entry
  point for model calls.

### P1-T3 — Auth core + commands + keyring (PKCE & API key)
- Model: **Tier S — Opus 4.8** (security-critical secrets/OAuth)
- Lane: RUST-CORE + RUST-CMD (`core/auth.rs`, `commands/auth.rs`, `store` keyring)
- Owns: `src-tauri/src/core/auth.rs`, `src-tauri/src/commands/auth.rs`, `src-tauri/src/store/secrets.rs`
- Depends on: P1-T1, P1-T2
- Parallel with: P1-T4, P1-T5, P1-T6
- Context: `docs/specs/auth.md`, `docs/06-security-guardrails.md` §6, ADR-0004
- Prompt: "Implement auth per docs/specs/auth.md: API-key save+validate (test
  call via LlmProvider) and ChatGPT OAuth PKCE with a transient loopback
  redirect listener; tokens/keys stored ONLY in the OS keyring (keyring crate),
  DB holds keyring_ref. Implement all `auth_*` commands from
  docs/05-ipc-contract.md. Transparent token refresh. Redact secrets everywhere.
  Tests: PKCE/state, keyring read/write (mocked), provider selection, and a
  security test asserting no secret appears in DB/logs."
- DoD: both auth methods persist an account; security test passes; refresh works.

### P1-T4 — Workspaces core + commands
- Model: **Tier A — Sonnet 4.6**
- Lane: RUST-CORE + RUST-CMD (`core/workspaces.rs`, `commands/workspaces.rs`)
- Owns: `src-tauri/src/core/workspaces.rs`, `src-tauri/src/commands/workspaces.rs`
- Depends on: P1-T1
- Parallel with: P1-T3, P1-T5, P1-T6
- Context: `docs/specs/workspaces.md`
- Prompt: "Implement workspaces per spec: CRUD, switch, active, default-workspace
  bootstrap on first run, `app:workspace_changed` event, and a scoping helper
  that injects `workspace_id` into all scoped queries. Integration test: cross-
  workspace isolation."
- DoD: switch re-scopes; cannot delete last workspace; isolation test passes.

### P1-T5 — Projects core + commands
- Model: **Tier A — Sonnet 4.6**
- Lane: RUST-CORE + RUST-CMD (`core/projects.rs`, `commands/projects.rs`)
- Owns: `src-tauri/src/core/projects.rs`, `src-tauri/src/commands/projects.rs`
- Depends on: P1-T1, P1-T4 (scoping helper)
- Parallel with: P1-T3, P1-T6
- Context: `docs/specs/projects.md`
- Prompt: "Implement projects per spec: add (folder picker via Rust dialog),
  repo detection (git/non-git/nested, default branch, remote), open (recents),
  remove WITHOUT deleting files on disk, missing-path handling. Integration tests
  against temp git repos; assert files survive removal."
- DoD: add/open/remove lifecycle works; files never deleted; git metadata
  detected.

### P1-T6 — Settings core + commands (layered)
- Model: **Tier A — Sonnet 4.6**
- Lane: RUST-CORE + RUST-CMD (`core/settings.rs`, `commands/settings.rs`)
- Owns: `src-tauri/src/core/settings.rs`, `src-tauri/src/commands/settings.rs`
- Depends on: P1-T1, P1-T4
- Parallel with: P1-T3, P1-T5
- Context: `docs/specs/profile-settings.md`
- Prompt: "Implement layered settings (workspace > global > default) per spec:
  `settings_get` (resolved), `settings_set` (writes correct layer), `theme_set`,
  `profile_get`. Non-secret global in settings.json, overrides in
  workspace.settings_json. Corrupt-file recovery with backup. Unit tests for
  resolution + recovery."
- DoD: layered resolution correct; theme persists; corrupt-file recovers.

### P1-T7 — Onboarding UI (both auth paths)
- Model: **Tier B — Gemini 3.5 Flash**
- Lane: UI-FEATURE (`src/features/auth/**`)
- Owns: `src/features/auth/**`
- Depends on: P1-T3
- Parallel with: P1-T8, P1-T9
- Context: `docs/specs/auth.md`, `docs/10-ui-ux-layout.md`
- Prompt: "Build the onboarding screen matching Codex: two options (Sign in with
  ChatGPT / Use API key). Wire to `auth_*` via lib/ipc.ts using generated types.
  Masked key input with inline validation; OAuth 'waiting for sign-in' state.
  Component tests with mocked IPC."
- DoD: both flows complete against the real commands; matches layout; tests pass.

### P1-T8 — Settings UI
- Model: **Tier B — Grok**
- Lane: UI-FEATURE (`src/features/settings/**`)
- Owns: `src/features/settings/**`
- Depends on: P1-T6, P1-T3 (account section)
- Parallel with: P1-T7, P1-T9
- Context: `docs/specs/profile-settings.md`, `docs/10-ui-ux-layout.md`
- Prompt: "Build the Settings view with sections (Appearance, Account, Models
  placeholder, Permissions placeholder, Advanced) per spec. Wire Appearance +
  Account to real commands; leave later sections as labelled placeholders.
  Profile menu in titlebar. Tests with mocked IPC."
- DoD: theme + default model + account management work; persists across restart.

### P1-T9 — Sidebar workspace switcher + project list wiring
- Model: **Tier C — MiniMax M3** (free; small wiring on top of existing shell)
- Lane: UI-FEATURE (`src/features/workspaces/**`, `src/features/projects/**`)
- Owns: `src/features/workspaces/**`, `src/features/projects/**`
- Depends on: P1-T4, P1-T5, Phase-0 shell
- Parallel with: P1-T7, P1-T8
- Context: `docs/specs/workspaces.md`, `docs/specs/projects.md`, `docs/10-ui-ux-layout.md`
- Prompt: "Wire the existing sidebar shell to real data: workspace switcher
  (list/switch/create) and Projects list (add via picker, open, remove). Use
  generated types + lib/ipc.ts. Re-scope on `app:workspace_changed`. Keep it
  thin — this is wiring, not new layout."
- DoD: switching workspace re-scopes the project list; add/open/remove visible in
  UI.

---

## Phase 1 sync step (P1-S)
- Model: **Tier S — Opus 4.8** (Integrator/Reviewer); Tier S must review P1-T3.
- Merge order: T1,T2 → T3,T4,T5,T6 → T7,T8,T9. Run full CI + security tests.
- Exit: sign in (either method), create workspace, add project, change theme —
  all persisted. (Roadmap Phase 1 exit.)
