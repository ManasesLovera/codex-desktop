# Spec — Authentication

**Status:** Draft · **Owner:** core · **Related:** ADR-0004, `docs/06-security-guardrails.md`, `usage.md`, `model-switching.md`

## Overview

Support **two** sign-in methods, exactly like Codex:

1. **Sign in with ChatGPT** — OAuth 2.0 + PKCE; uses the user's ChatGPT plan
   entitlements.
2. **OpenAI API key** — paste a key; billed against that key via the OpenAI API.

Multiple accounts may coexist; each workspace selects an active account.

## User stories

- As a new user I can choose "Sign in with ChatGPT" or "Use API key" in onboarding.
- I can add a second account later and switch between them per workspace.
- My credentials are stored securely and never shown again in plaintext.
- I can sign out, which removes the stored secret.

## UI/UX

- Onboarding screen with two large options (mirror Codex).
- ChatGPT path: opens system browser, shows "waiting for sign-in…", completes on
  redirect/callback.
- API-key path: masked input, paste support, inline validation (test call),
  optional label.
- Settings → Account: list accounts (kind, label, default model), add/remove, set
  active, see auth status/expiry.

## Behavior / functional requirements

### ChatGPT OAuth (PKCE)

1. `auth_start_chatgpt_oauth` generates `code_verifier`/`code_challenge` + `state`,
   returns the `auth_url`, app opens it in the system browser.
2. Callback captured via a **loopback redirect** (`http://127.0.0.1:<port>/cb`)
   handled by a transient Rust HTTP listener (no public redirect).
3. `auth_complete_chatgpt_oauth` exchanges `code`+`verifier` for tokens; stores
   access+refresh in keyring; persists an `account(kind=chatgpt_oauth)` row.
4. Rust refreshes the access token transparently before expiry.

### API key

1. `auth_save_api_key` validates the key with a lightweight authenticated call
   (e.g. list models); on success stores the key in the keyring under a generated
   ref and persists `account(kind=api_key)`.
2. Invalid keys return `AppError{code:"auth.invalid_key"}`.

### Transport selection

- The active account's `kind` selects the provider module (`providers/chatgpt`
  vs `providers/openai`). Both implement the same internal `LlmProvider` trait so
  chats/agents are provider-agnostic.

## IPC

Commands: `auth_list_accounts`, `auth_start_chatgpt_oauth`,
`auth_complete_chatgpt_oauth`, `auth_save_api_key`, `auth_remove_account`,
`auth_active_account`, `auth_set_active`. (See `docs/05-ipc-contract.md`.)

## Data model

`account` table (no secrets — `keyring_ref` only). See `docs/04-data-model.md`.

## Security

- Secrets only in OS keyring; never in DB/logs/WebView.
- PKCE; loopback redirect; `state` checked to prevent CSRF.
- Tokens redacted everywhere; logout deletes the keyring entry.
- See `docs/06-security-guardrails.md` §6.

## Edge cases

- OAuth window closed/cancelled → timeout, clean cancel, no partial account.
- Refresh token revoked → prompt re-auth; mark account `needs_reauth`.
- Keyring unavailable (no Secret Service) → clear error with remediation; offer
  session-only memory storage as explicit fallback (not persisted).
- Multiple workspaces sharing one account.

## Tests

- **Unit (Rust):** PKCE generation, state validation, keyring read/write
  (mocked), token-refresh logic, provider selection by `kind`.
- **Integration:** API-key validation against a mocked OpenAI server; OAuth code
  exchange against a mock IdP; loopback listener lifecycle.
- **E2E:** onboarding both paths (OAuth mocked), add/remove/switch account,
  sign-out clears secret.
- **Security:** assert no secret appears in logs, events, or DB rows.

## Acceptance criteria

- [ ] Both methods complete successfully and persist an account.
- [ ] Secrets verified absent from DB and logs.
- [ ] Token refresh works without user interaction.
- [ ] Switching active account changes which entitlement/billing is used.
