# Spec — Sites

**Status:** Draft · **Owner:** core · **Related:** `projects.md`, `side-panel.md` (browser), `terminal.md`

## Overview

"Sites" lets users run/preview local web projects (dev servers or static dirs)
and view them in the in-app browser side panel — matching Codex's Sites feature.

## User stories

- I register a site for a project (a dev command and/or a static root).
- I start the site; the app runs the dev command and detects the local URL.
- I preview it in the side-panel browser and stop it when done.

## UI/UX

- **Sites** sidebar section: list (name, status dot, URL), start/stop, open in
  side-panel browser, logs.
- Create dialog: name, root path, optional dev command, optional explicit URL/port.

## Behavior / functional requirements

- `site_create({project_id?, name, root_path, dev_command?, url?})`.
- `site_start({id})`: if `dev_command`, spawn it as a tracked child process in
  `root_path`; detect the served URL (parse stdout for `http://localhost:PORT`
  or use configured URL); set status `running`; stream `site:{id}:log`.
- Static sites with no dev command: serve `root_path` via a lightweight built-in
  static server on an ephemeral port.
- `site_stop({id})`: terminate the process/server; status `stopped`.
- The detected URL is opened in the side-panel browser (`side-panel.md`).

## Security

- Dev commands are user-defined and run with user privileges (like the terminal),
  tracked for clean shutdown. Agent-initiated site commands go through the harness.
- The built-in static server binds to loopback only.

## IPC

`site_list`, `site_create`, `site_start`, `site_stop`, `site_status`. Events
`site:{id}:status|log`.

## Data model

`site` table. See `docs/04-data-model.md`.

## Edge cases

- Port already in use → pick next free / report.
- Dev command exits immediately → status `error` with logs.
- URL not detected → prompt user to set it.
- Window close → stop all running sites.

## Tests

- **Unit:** URL detection from log lines, static-server port selection.
- **Integration:** start a trivial dev command (e.g. `python -m http.server`),
  detect URL, stop; static-dir serving.
- **E2E:** create site, start, preview in side panel, stop.

## Acceptance criteria

- [ ] Dev-command and static sites both start, expose a URL, and stop cleanly.
- [ ] Preview renders in the side-panel browser.
- [ ] No orphan dev-server processes after stop/close.
