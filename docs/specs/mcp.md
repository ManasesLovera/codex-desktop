# Spec — Custom MCP Servers

**Status:** Draft · **Owner:** core · **Related:** `agents.md`, `chats.md`, `plugins.md`, `permissions-guardrails.md`

## Overview

Connect external **Model Context Protocol** servers that expose tools/resources
to chats and agents. Support stdio (spawned), SSE, and HTTP transports, with
secure secret handling and a management UI — matching Codex's MCP support.

## User stories

- I add a custom MCP server (command + args, or URL) and enable it.
- I see the tools it exposes and can test the connection.
- Agents/chats can call those tools (subject to guardrails).

## UI/UX

- Settings/sidebar **MCP** manager: list servers (name, transport, status),
  add/edit/remove, enable toggle, "Test connection" → shows discovered tools.
- Per-server config: command/args/env (secret env masked) or URL/headers.
- Tool calls appear as tool-call cards in chat/agent timelines.

## Behavior / functional requirements

- `mcp_add({name, transport, command?, args?, url?, env?})`: persist; secret env
  vars → keyring (`env_keyring_ref`).
- The MCP host (`src-tauri/src/mcp/`) implements an MCP client: handshake,
  `tools/list`, `tools/call`, resources. Stdio servers spawned as tracked child
  processes; remote servers connected over SSE/HTTP.
- `mcp_test({id})` connects and returns discovered tools.
- Enabled servers' tools are registered into the tool registry available to the
  active provider loop; calls route back through the host.
- `mcp_enable({id, enabled})` connects/disconnects; emits `mcp:{id}:status`.

## Security

- Stdio servers run under the sandbox + harness like any other child process;
  remote servers are URL-allow-listed.
- Tool calls from the model pass through the harness (approval where required).
- Secrets only in keyring; redacted in logs (`docs/06-security-guardrails.md`).
- Third-party servers clearly labelled with what they can access before enable.

## IPC

`mcp_list`, `mcp_add`, `mcp_update`, `mcp_remove`, `mcp_enable`, `mcp_test`,
`mcp_tools`. Events `mcp:{id}:status|log`.

## Data model

`mcp_server` table. See `docs/04-data-model.md`.

## Edge cases

- Server crashes → status `error`, auto-retry with backoff, surfaced in UI.
- Slow/handshake timeout → fail cleanly with diagnostics.
- Tool name collisions across servers → namespace by server.
- Server offline at startup → lazy connect on first use.

## Tests

- **Unit:** config persistence, secret routing to keyring, tool namespacing.
- **Integration:** against a mock MCP server (stdio + SSE) — handshake, list
  tools, call a tool, handle crash/restart.
- **E2E:** add server, test connection, enable, invoke a tool from a chat.

## Acceptance criteria

- [ ] stdio, SSE, and HTTP transports all work.
- [ ] Tools discoverable and callable from chats/agents.
- [ ] Secrets stored in keyring; tool calls respect guardrails.
