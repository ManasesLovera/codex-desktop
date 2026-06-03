# ADR-0004: Dual auth (ChatGPT OAuth + API key) with keyring-only secrets

**Status:** Accepted
**Date:** 2026-06-03
**Deciders:** Project lead

## Context

Codex Desktop lets users sign in with their ChatGPT account **or** use an OpenAI
API key. We must support both, store credentials securely, and keep the WebView
untrusted (`docs/06-security-guardrails.md`, `docs/specs/auth.md`).

## Decision

- Support **two** account kinds: `chatgpt_oauth` (OAuth 2.0 + PKCE, loopback
  redirect) and `api_key`.
- Store **all** secrets in the **OS keyring** (`keyring` crate → Secret
  Service/kwallet). The database stores only a `keyring_ref`.
- All provider calls happen in Rust behind a single `LlmProvider` trait so chats/
  agents are provider-agnostic.

## Options Considered

### Secret storage

**A. OS keyring (chosen)** — encrypted by the desktop session; standard; never on
disk in plaintext. *Con:* requires a Secret Service/kwallet (handle absence
gracefully).

**B. Encrypted file (app-managed key)** — works everywhere. *Con:* we own key
management; the master key still has to live somewhere; weaker than OS keyring.

**C. Plaintext config** — rejected outright (insecure).

### OAuth redirect

**A. Loopback `127.0.0.1` listener (chosen)** — no public redirect; standard for
desktop PKCE; transient listener.
**B. Custom URL scheme** — viable but more fragile across Linux desktops; keep as
fallback.

## Trade-off Analysis

Keyring is the security best-practice on Linux desktops; the only real cost is
graceful handling when no Secret Service exists (we surface a clear error and an
explicit, non-persistent session-only fallback). Loopback PKCE is the
well-trodden desktop OAuth path and avoids hosting a redirect.

## Consequences

- **Easier:** strong secret hygiene; provider-agnostic core; clean logout.
- **Harder:** must handle keyring-absent environments; must implement token
  refresh and `needs_reauth` states.
- **Revisit if:** OpenAI changes desktop auth; if a maintained mobile bridge
  affects token handling (`docs/specs/remote-mobile.md`).

## Action Items

1. [ ] Implement PKCE + loopback flow and API-key validation.
2. [ ] `LlmProvider` trait with `openai` and `chatgpt` impls.
3. [ ] Keyring read/write + redaction in logs/events.
4. [ ] Graceful keyring-absent fallback with clear UX.
