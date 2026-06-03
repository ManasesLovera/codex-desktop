# Phase 7 — Remote Mobile (agent task plan)

**Goal:** control the desktop from a paired mobile device — view runs, send
prompts, approve actions — **off by default**, security-first. Remote actions are
bounded by the same harness profile as local ones.

Spec: [`remote-mobile.md`](../specs/remote-mobile.md). Security:
[`../06-security-guardrails.md`](../06-security-guardrails.md) §7.
Routing: [`../11-agent-automation-guide.md`](../11-agent-automation-guide.md).

> **Gate:** before any code, an ADR for the transport must be accepted
> (P7-T0). No free-tier (C) tasks this phase.

## Wave plan

```
Wave 0: P7-T0 transport ADR (S) ── blocks everything
Wave 1: P7-T1 pairing + crypto + channel (S)
Wave 2: P7-T2 remote command bridge + harness binding (S)
Wave 3 (parallel): P7-T3 device-mgmt commands(A)  P7-T4 remote settings UI(A)
Sync: P7-S (security-focused)
```

---

### P7-T0 — Transport ADR
- Model: **Tier S — Opus 4.8**
- Lane: DOCS (`docs/adr/0008-remote-transport.md`)
- Owns: `docs/adr/0008-remote-transport.md`
- Depends on: Phase 6 · Parallel with: none
- Context: `docs/specs/remote-mobile.md`, `docs/06-security-guardrails.md` §7
- Prompt: "Write an ADR choosing the remote transport: evaluate (A) relay via an
  existing Codex/OpenAI mobile bridge if available, (B) self-hosted encrypted
  relay, (C) LAN-only direct. Decide based on security, setup friction, and
  reliability. Specify the auth/encryption scheme (E2E, replay protection) and
  the pairing model. This ADR is binding for T1–T4."
- DoD: accepted ADR with a concrete transport + crypto + pairing decision.

### P7-T1 — Pairing, crypto, encrypted channel
- Model: **Tier S — Opus 4.8** (cryptography/auth correctness)
- Lane: RUST-CORE (`core/remote/**`)
- Owns: `src-tauri/src/core/remote/**`
- Depends on: P7-T0 · Parallel with: none
- Context: ADR-0008, `docs/specs/remote-mobile.md`
- Prompt: "Implement per ADR-0008 and spec: enable/disable (OFF by default);
  pairing via short-lived, single-use, rate-limited codes exchanged for a
  long-lived per-device credential (device keeps it; desktop stores only a hashed
  ref in keyring); an authenticated, end-to-end encrypted channel with replay
  protection. NO secrets ever transit to the device. Tests: code generation/
  expiry/rate-limit, credential hashing, encrypt/decrypt round-trip, replay
  rejection."
- DoD: secure pairing + encrypted channel; security tests pass; off by default.

### P7-T2 — Remote command bridge + harness binding
- Model: **Tier S — Opus 4.8** (must not let remote exceed local guardrails)
- Lane: RUST-CORE (`core/remote/bridge.rs`)
- Owns: `src-tauri/src/core/remote/bridge.rs`
- Depends on: P7-T1, P4-T2 (harness) · Parallel with: none
- Context: `docs/specs/remote-mobile.md`, `docs/06-security-guardrails.md` §7
- Prompt: "Map incoming remote commands onto the SAME core ops as local ones,
  enforced through the active harness profile — a device can NEVER exceed local
  guardrails. Support configuring sensitive approvals to require LOCAL
  confirmation. Surface `remote:device:connected`/`remote:command` events and
  mirror approval prompts on both ends. Integration test: a mock device sends a
  prompt + an agent action; assert it cannot exceed the harness; revoked device
  rejected."
- DoD: remote actions bounded by harness; local-confirm option works; revoked
  devices rejected.

### P7-T3 — Device-management commands
- Model: **Tier A — Sonnet 4.6** · Lane: RUST-CMD (`commands/remote.rs`)
- Owns: `src-tauri/src/commands/remote.rs`
- Depends on: P7-T1 · Parallel with: P7-T4
- Context: `docs/05-ipc-contract.md` (Remote)
- Prompt: "Expose `remote_status/enable/pair/devices/revoke` per the contract,
  delegating to core/remote. Revocation invalidates credentials immediately.
  Smoke integration test."
- DoD: commands round-trip; revoke is immediate.

### P7-T4 — Remote settings UI
- Model: **Tier A — Sonnet 4.6** · Lane: UI-FEATURE (`src/features/remote-mobile/**`)
- Owns: `src/features/remote-mobile/**`
- Depends on: P7-T3 · Parallel with: P7-T3
- Context: `docs/specs/remote-mobile.md`, `docs/10-ui-ux-layout.md`
- Prompt: "Build Settings→Remote: enable toggle (OFF default), 'Pair device'
  showing a short-lived code + QR, paired-devices list with revoke, and a
  status-bar indicator when active. Wire `remote_*`. Tests mocked."
- DoD: enable/pair/revoke from UI; off by default; indicator shows activity.

---

## Phase 7 sync step (P7-S)
- Model: **Tier S — Opus 4.8** (Integrator). Tier S reviews ALL tasks. Run the
  security suite: no secret crosses the channel; revoked device rejected; remote
  cannot exceed harness; E2E pairing + remote prompt (simulated device).
- Merge order: T0 → T1 → T2 → T3,T4.
- Exit: pair a device (or simulator), drive the app within guardrails, revoke it.
  (Roadmap Phase 7 exit.)
