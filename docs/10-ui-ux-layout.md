# 10 — UI/UX Layout & Visual Parity

**Hard requirement:** the UI must match OpenAI's Codex Desktop pixel-for-pixel.
This document is the parity reference. Where this doc and the real app disagree,
the real app wins — update this doc.

> Use the `/design-system` skill output as the canonical token set. All colors,
> spacing, radii, typography, shadows, and motion come from tokens in
> `src/styles/tokens.css` (`--cdx-*`). Never hardcode values.

## Window shell

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ◐ titlebar (custom; workspace switcher · search · profile/usage)            │
├──────────┬─────────────────────────────────────────────┬───────────────────┤
│          │                                             │                   │
│  LEFT    │              MAIN AREA                       │   RIGHT SIDE      │
│  SIDEBAR │  (active view: chat / agent / settings…)     │   PANEL (dock)    │
│          │                                             │                   │
│  nav     │   ┌───────────────────────────────────┐     │  tabs:            │
│  rail +  │   │ chat transcript (virtualized)      │     │  • Browser        │
│  list    │   │                                   │     │  • Chat           │
│          │   │                                   │     │  • Terminal       │
│          │   ├───────────────────────────────────┤     │  • Review changes │
│          │   │ composer (model · plan · attach)   │     │                   │
│          │   └───────────────────────────────────┘     │                   │
├──────────┴─────────────────────────────────────────────┴───────────────────┤
│ status bar (harness profile · branch/worktree · model · usage · sync)        │
└───────────────────────────────────────────────────────────────────────────┘
```

### Left sidebar

Collapsible nav rail + contextual list. Sections (matching Codex):

- **Workspace switcher** (top): current workspace, dropdown to switch/create.
- **Pinned** — pinned chats/projects/agents (drag to reorder).
- **Chats** — recent conversations, searchable, grouped by date.
- **Projects** — repos; each expands to worktrees/agents/sites.
- **Agents** — running/recent agent runs with live status dots.
- **Automations** — scheduled/triggered tasks.
- **Sites** — local sites with running indicator.
- **Plugins / MCP** — installed integrations.
- Footer: **Profile**, **Usage**, **Settings**.

### Main area

Hosts the active view. Most common is the **chat view**:

- **Transcript**: virtualized message list. User/assistant bubbles, tool-call
  cards (collapsible), diff cards, plan cards, attachment chips, code blocks with
  copy + syntax highlight, streaming cursor.
- **Composer**: multiline input; left controls = **model switcher**, **plan
  mode** toggle, **attach/file upload**, harness profile chip; send/stop button.
  Slash-command + @-mention affordances.

Other views render here too: agent run detail, settings, usage dashboard, site
manager, automation editor, MCP/plugin manager.

### Right side panel (dockable)

Resizable, collapsible. Tabbed surfaces (match Codex):

- **Browser** — sandboxed web view for previews/docs.
- **Chat** — secondary/side chat alongside main work.
- **Terminal** — xterm.js PTY.
- **Review changes** — diff viewer for the current worktree/agent run with
  per-file/per-hunk view and approve/stage actions.

Panel state (open tab, width) persists per project/workspace.

### Status bar

Always-visible: active **harness profile** (with permission icon), current
**branch/worktree**, active **model**, **usage** glance, background sync/agent
activity, error/toast anchor.

### Command palette

`Ctrl/Cmd-K` global palette: switch chats/projects/workspaces, run commands,
start agents, change model, toggle panels. Fuzzy search across entities.

## Theming

- Light + dark, matching Codex exactly, driven by tokens.
- Respects system preference by default; override in Settings.
- Test parity at 100%, 125%, 150% display scaling.

## Iconography & typography

- Replicate Codex's icon set (lucide as base, custom where needed).
- Font stack mirrors Codex (system UI for chrome, monospace for code/terminal —
  exact families in tokens).

## Motion

- Subtle, matching Codex: streaming token fade-in, panel slide, list reordering.
- Honor `prefers-reduced-motion`.

## Empty / loading / error states

Every view defines: empty state (onboarding hint), skeleton/loading, and inline
error matching Codex's tone. No raw spinners where the real app uses skeletons.

## Parity checklist (per screen)

1. Layout & spacing match at all three scales.
2. Colors/typography come from tokens and match.
3. Interactive states (hover/active/focus/disabled) match.
4. Keyboard navigation & shortcuts match.
5. Motion matches and respects reduced-motion.
6. Empty/loading/error states present and matching.

Visual regression is enforced via screenshot tests (see
`docs/07-testing-strategy.md`).
