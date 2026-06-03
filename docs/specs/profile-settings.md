# Spec — Profile & Settings

**Status:** Draft · **Owner:** core · **Related:** `auth.md`, `workspaces.md`, `permissions-guardrails.md`, `usage.md`

## Overview

Profile (account identity) and the Settings surface for the whole app —
appearance, accounts, models, MCP/plugins, harness profiles, automations,
remote, and advanced/debug. Mirrors Codex's settings.

## User stories

- I view my profile (signed-in identity, plan/usage glance).
- I configure theme, default model, keybindings, and behavior.
- I manage accounts, MCP servers, plugins, and harness profiles from one place.

## UI/UX

- **Profile** menu (titlebar): identity, switch account, usage glance, sign out.
- **Settings** view with sections:
  - **Appearance** — theme (system/light/dark), density, font size.
  - **Account** — accounts (`auth.md`), active selection.
  - **Models** — default model, reasoning effort defaults.
  - **Permissions** — harness profiles (`permissions-guardrails.md`).
  - **MCP** / **Plugins** — managers (`mcp.md`, `plugins.md`).
  - **Automations** — manager (`automations.md`).
  - **Remote** — pairing (`remote-mobile.md`).
  - **Advanced** — data dir, logs, reset, debug panel.

## Behavior / functional requirements

- Settings split: **secret** (keyring), **non-secret global** (`settings.json`),
  **workspace overrides** (`workspace.settings_json`). Resolution order:
  workspace → global → defaults.
- `settings_get` returns the resolved effective settings; `settings_set({patch})`
  writes to the correct layer.
- `theme_set` applies immediately (tokens swap), persists.
- `profile_get` returns active account identity + usage glance.

## IPC

`settings_get`, `settings_set`, `profile_get`, `theme_set`. See
`docs/05-ipc-contract.md`.

## Data model

`settings.json` (non-secret), `workspace.settings_json` (overrides), keyring
(secrets). See `docs/04-data-model.md`.

## Edge cases

- Corrupt settings file → fall back to defaults + backup the bad file.
- Conflicting workspace override vs global → workspace wins (documented).
- Reset/clear data → explicit confirmation; preserves nothing unless chosen.

## Tests

- **Unit:** settings layering/resolution, theme application.
- **Integration:** set at workspace vs global level and verify effective result;
  corrupt-file recovery.
- **E2E:** change theme and default model, restart, verify persistence.

## Acceptance criteria

- [ ] Layered settings resolve correctly (workspace > global > default).
- [ ] All sections present and functional.
- [ ] Theme/model changes persist across restart.
