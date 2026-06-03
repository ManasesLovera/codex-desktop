# Phase 5 — MCP & Plugins (agent task plan)

**Goal:** connect custom MCP servers (stdio/SSE/HTTP) and install plugins; expose
their tools to chats/agents through the harness.

Specs: [`mcp.md`](../specs/mcp.md), [`plugins.md`](../specs/plugins.md).
Routing rules: [`../11-agent-automation-guide.md`](../11-agent-automation-guide.md).

## Wave plan

```
Wave 1: P5-T1 migration(mcp_server, plugin)  ─ MIGRATION
Wave 2: P5-T2 MCP host + tool routing (S)
Wave 3 (parallel): P5-T3 mcp commands(A)  P5-T4 plugin manifest/install(A)
Wave 4 (parallel): P5-T5 MCP manager UI(B)  P5-T6 plugin manager UI(B)  P5-T7 mock MCP fixtures(C)
Sync: P5-S
```

---

### P5-T1 — MCP/plugin schema migration
- Model: **Tier A — Sonnet 4.6** · Lane: MIGRATION
- Owns: `migrations/0006_*.sql`, `mcp_server`/`plugin` models
- Depends on: Phase 4 · Context: `docs/04-data-model.md`
- Prompt: "Add migration `0006` for `mcp_server` and `plugin` per
  docs/04-data-model.md (incl. `env_keyring_ref`). Add models (serde+TS)."
- DoD: applies; models compile.

### P5-T2 — MCP client host + tool routing
- Model: **Tier S — Opus 4.8** (untrusted external servers + harness routing)
- Lane: RUST-CORE (`mcp/**`)
- Owns: `src-tauri/src/mcp/**`
- Depends on: P5-T1, P4-T2 (harness) · Parallel with: none
- Context: `docs/specs/mcp.md`, `docs/06-security-guardrails.md`
- Prompt: "Implement an MCP client host per spec: handshake, tools/list,
  tools/call, resources, over stdio (spawned, tracked child + sandbox), SSE, and
  HTTP. Namespace tools by server. Register enabled servers' tools into the tool
  registry used by the provider loop; route calls back through the host AND
  through `harness::evaluate`. Secret env → keyring. Auto-retry with backoff on
  crash; status events. Integration tests against a mock MCP server (stdio+SSE):
  handshake, list, call, crash/restart; assert tool calls pass the harness and
  secrets stay in keyring."
- DoD: all three transports work; tools callable under harness; secrets in
  keyring; tests pass.

### P5-T3 — MCP commands
- Model: **Tier A — Sonnet 4.6** · Lane: RUST-CMD (`commands/mcp.rs`)
- Owns: `src-tauri/src/commands/mcp.rs`
- Depends on: P5-T2 · Parallel with: P5-T4
- Context: `docs/05-ipc-contract.md` (MCP)
- Prompt: "Expose `mcp_list/add/update/remove/enable/test/tools` and status/log
  events per the contract, delegating to the host. Smoke integration test."
- DoD: commands round-trip; `mcp_test` returns discovered tools.

### P5-T4 — Plugin manifest + install/lifecycle
- Model: **Tier A — Sonnet 4.6**
- Lane: RUST-CORE + RUST-CMD (`core/plugins.rs`, `commands/plugins.rs`)
- Owns: `src-tauri/src/core/plugins.rs`, `src-tauri/src/commands/plugins.rs`
- Depends on: P5-T1, P5-T2 (plugins may register MCP servers)
- Parallel with: P5-T3
- Context: `docs/specs/plugins.md`
- Prompt: "Implement plugins per spec: manifest (name/version/kind/capabilities/
  config schema/contributions), `plugin_install` (fetch+validate manifest),
  enable/disable (register/unregister contributions, e.g. create mcp_server
  rows), configure (schema-validated; secrets→keyring), remove (clean unregister).
  Capabilities approved on install; no elevation beyond harness. Tests: manifest
  validation, capability gating, contribution register/cleanup."
- DoD: install→enable→use→remove lifecycle clean; capabilities surfaced+approved.

### P5-T5 — MCP manager UI
- Model: **Tier B — Grok** · Lane: UI-FEATURE (`src/features/mcp/**`)
- Owns: `src/features/mcp/**`
- Depends on: P5-T3 · Parallel with: P5-T6, P5-T7
- Context: `docs/specs/mcp.md`, `docs/10-ui-ux-layout.md`
- Prompt: "Build the MCP manager: list (name/transport/status), add/edit/remove,
  enable toggle, 'Test connection' showing discovered tools; secret env masked.
  Wire to `mcp_*`. Tests with mocked IPC."
- DoD: manage servers + test connection from UI.

### P5-T6 — Plugin manager UI
- Model: **Tier B — Gemini 3.5 Flash** · Lane: UI-FEATURE (`src/features/plugins/**`)
- Owns: `src/features/plugins/**`
- Depends on: P5-T4 · Parallel with: P5-T5, P5-T7
- Context: `docs/specs/plugins.md`
- Prompt: "Build the Plugins manager: installed list (name/source/kind/enabled),
  install dialog with manifest+capabilities preview, configure, remove. Wire to
  `plugin_*`. Tests with mocked IPC."
- DoD: install/enable/configure/remove from UI; capabilities shown before enable.

### P5-T7 — Mock MCP server fixtures
- Model: **Tier C — DeepSeek v4 Flash** (free; test fixtures only)
- Lane: TESTS (`tests/fixtures/mcp/**`)
- Owns: `tests/fixtures/mcp/**`
- Depends on: P5-T2 (protocol shape) · Parallel with: P5-T5, P5-T6
- Context: `docs/specs/mcp.md`
- Prompt: "Create a minimal mock MCP server (stdio + SSE variants) used by the
  integration tests: responds to handshake, returns 2 fake tools, echoes a
  tools/call. Documented usage in a README in the fixtures dir."
- DoD: fixtures usable by P5-T2 tests; both transports.

---

## Phase 5 sync step (P5-S)
- Model: **Tier S — Opus 4.8**; Tier S reviews P5-T2. Full CI + security (tool
  calls gated, secrets in keyring) + e2e (add server/plugin, invoke a tool).
- Merge order: T1 → T2 → T3,T4 → T5,T6,T7.
- Exit: add a custom MCP server and a plugin; invoke their tools from chats/
  agents safely. (Roadmap Phase 5 exit.)
