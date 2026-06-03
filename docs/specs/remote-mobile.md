# Spec — Remote Mobile

**Status:** Draft · **Owner:** core · **Related:** `permissions-guardrails.md`, `agents.md`, `chats.md`, `auth.md`

## Overview

Control the desktop app from a paired mobile device: view chats/agent runs,
send prompts, and approve agent actions remotely — matching Codex's Remote/Mobile
capability. **Off by default**; security-first.

## User stories

- I enable remote control and pair my phone with a short code.
- From my phone I view ongoing agent runs and approve/deny actions.
- I send a prompt or start an agent remotely.
- I can revoke a device at any time.

## UI/UX

- Settings → **Remote**: enable toggle (off by default), "Pair device" → shows a
  short-lived pairing code + QR, list of paired devices with revoke.
- Status bar indicator when remote is active / a device is connected.
- Approval requests can be configured to require **local** confirmation for the
  most sensitive actions.

## Behavior / functional requirements

- `remote_enable({enabled})` starts/stops the remote endpoint.
- Pairing: `remote_pair()` returns a short-lived code; the device exchanges it
  for a long-lived, per-device credential (stored device-side; server keeps a
  hashed reference).
- Transport: authenticated, end-to-end encrypted channel. v1 design options:
  relay via OpenAI/Codex's mobile bridge if available, else a self-hosted
  encrypted relay or LAN-only mode. The chosen mechanism is recorded in an ADR
  before implementation.
- Remote commands map onto the **same** IPC/core operations as local ones and are
  subject to the **same harness profile** — a phone can never exceed local
  guardrails.
- Events: `remote:device:connected`, `remote:command`. Approvals surface on both
  desktop and device.

## Security (critical)

- Disabled by default; explicit enable required.
- Pairing codes are short-lived, single-use, rate-limited.
- All traffic encrypted and authenticated; replay protection.
- Remote actions bounded by the active harness profile; sensitive approvals can
  require local confirmation.
- Per-device revocation invalidates credentials immediately.
- No secrets ever transit to the device; only rendered content + control.
- See `docs/06-security-guardrails.md` §7.

## IPC

`remote_status`, `remote_enable`, `remote_pair`, `remote_devices`,
`remote_revoke`. Events `remote:device:connected`, `remote:command`.

## Data model

Paired devices stored (hashed credential ref in keyring); remote config in
settings. Extend `account`/settings as needed.

## Edge cases

- Pairing code expiry / wrong code → reject, rate-limit.
- Connection loss → device reconnects with stored credential; pending approvals
  preserved.
- Revocation mid-session → immediate disconnect.
- Desktop offline → remote unavailable; device shows clear state.

## Tests

- **Unit:** pairing code generation/expiry/rate-limit, credential hashing,
  harness binding for remote commands.
- **Integration:** mock device pairs, sends a prompt, approves an action; verify
  it cannot exceed the harness profile; revocation disconnects.
- **E2E:** enable remote, generate code, simulate device connect + remote prompt.
- **Security:** assert no secrets cross the channel; revoked device is rejected.

## Acceptance criteria

- [ ] Off by default; explicit, secure pairing.
- [ ] Remote actions bounded by harness profile.
- [ ] Per-device revocation is immediate.
- [ ] End-to-end encryption verified; no secret leakage.
