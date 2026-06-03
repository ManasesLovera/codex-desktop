# Spec — Plugins

**Status:** Draft · **Owner:** core · **Related:** `mcp.md`, `agents.md`, `permissions-guardrails.md`

## Overview

Installable extensions that add capabilities: bundled MCP servers, custom agent
backends, tool sets, or UI integrations. Mirrors Codex's plugins surface.

## User stories

- I browse/install a plugin from a source (registry URL, git, local path).
- I enable/disable and configure plugins.
- A plugin can register an MCP server, an agent kind, or commands.

## UI/UX

- **Plugins** manager: installed list (name, source, kind, enabled), install,
  configure, remove. Each plugin shows the permissions/capabilities it requests.
- Install dialog: source input → manifest preview (name, version, capabilities,
  what it can access) → confirm.

## Behavior / functional requirements

- A plugin is described by a **manifest** (`name`, `version`, `kind`,
  `capabilities`, config schema, and what it contributes: MCP server defs, agent
  backend, tools, commands).
- `plugin_install({source})`: fetch/validate manifest, persist `plugin` row,
  register its contributions (e.g. create `mcp_server` entries) when enabled.
- `plugin_enable({id, enabled})` activates/deactivates contributions.
- `plugin_configure({id, config})` validated against the manifest schema; secrets
  → keyring.
- Plugin-contributed code runs under the same guardrails as MCP/agents.

## Security

- Manifest declares required capabilities; user must approve on install.
- No implicit elevation — plugins cannot exceed the harness profile.
- Sandbox third-party execution where possible
  (`docs/06-security-guardrails.md`).

## IPC

`plugin_list`, `plugin_install`, `plugin_enable`, `plugin_remove`,
`plugin_configure`. See `docs/05-ipc-contract.md`.

## Data model

`plugin` table; may create linked `mcp_server` rows. See `docs/04-data-model.md`.

## Edge cases

- Invalid/unsigned manifest → reject with reason.
- Version conflicts / duplicate install → upgrade or focus existing.
- Plugin contributes a failing MCP server → isolate failure to that plugin.
- Remove plugin → cleanly unregister all contributions.

## Tests

- **Unit:** manifest validation, capability/permission gating, config schema
  validation.
- **Integration:** install (mock source) → contributions registered → enable →
  used → remove cleans up.
- **E2E:** install a sample plugin that adds an MCP server, enable, use it,
  remove.

## Acceptance criteria

- [ ] Install/enable/configure/remove lifecycle works.
- [ ] Capabilities surfaced and approved before activation.
- [ ] Contributions (MCP/agent/tools) integrate and clean up correctly.
