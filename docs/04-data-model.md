# 04 — Data Model

Persistence is **SQLite** (`app.db`) accessed via `sqlx` from the Rust core.
Secrets are **not** stored here — they live in the OS keyring (see
`docs/specs/auth.md`). Non-secret prefs live in `settings.json`.

## Entity overview

```
Workspace 1───* Project 1───* Chat 1───* Message
    │               │            └──* Attachment
    │               ├──* Worktree
    │               ├──* AgentRun 1───* AgentEvent
    │               └──* AutomationRun
    ├──* McpServer
    ├──* Plugin
    ├──* Site
    ├──* Automation
    └──* Pinned (polymorphic)
Account (auth identities)  ── referenced by Workspace
UsageSnapshot              ── per account/day
```

## Tables

> Types shown are logical; SQLite affinities used in practice
> (`TEXT`, `INTEGER`, `BLOB`). Timestamps are RFC3339 `TEXT` (UTC). IDs are UUIDv7
> `TEXT` for sortability. All `*_at` are UTC.

### `workspace`
| col | type | notes |
|-----|------|-------|
| id | TEXT pk | |
| name | TEXT | |
| account_id | TEXT fk→account | active auth identity |
| settings_json | TEXT | workspace-scoped overrides |
| created_at / updated_at | TEXT | |

### `account`
Auth identity metadata (NO secrets — token refs only).
| col | type | notes |
|-----|------|-------|
| id | TEXT pk | |
| kind | TEXT | `chatgpt_oauth` \| `api_key` |
| label | TEXT | e.g. email or "Personal key" |
| keyring_ref | TEXT | key under which secret is stored |
| default_model | TEXT | |
| created_at | TEXT | |

### `project`
| col | type | notes |
|-----|------|-------|
| id | TEXT pk | |
| workspace_id | TEXT fk | |
| name | TEXT | |
| root_path | TEXT | absolute repo path |
| vcs | TEXT | `git` \| `none` |
| default_branch | TEXT | |
| last_opened_at | TEXT | for recents ordering |
| created_at | TEXT | |

### `chat`
| col | type | notes |
|-----|------|-------|
| id | TEXT pk | |
| project_id | TEXT fk (nullable) | chats may be project-less |
| workspace_id | TEXT fk | |
| title | TEXT | auto-generated, editable |
| model | TEXT | active model id |
| mode | TEXT | `chat` \| `plan` \| `agent` |
| harness_profile_id | TEXT fk (nullable) | permission profile |
| archived | INTEGER | 0/1 |
| created_at / updated_at | TEXT | |

### `message`
| col | type | notes |
|-----|------|-------|
| id | TEXT pk | |
| chat_id | TEXT fk | |
| parent_id | TEXT (nullable) | message tree (edits/branches) |
| role | TEXT | `user` \| `assistant` \| `tool` \| `system` |
| content_json | TEXT | rich content blocks (text, code, tool calls) |
| tokens_in / tokens_out | INTEGER | |
| status | TEXT | `complete` \| `streaming` \| `error` \| `cancelled` |
| created_at | TEXT | |

### `attachment`
| col | type | notes |
|-----|------|-------|
| id | TEXT pk | |
| message_id | TEXT fk (nullable) | |
| chat_id | TEXT fk | |
| filename | TEXT | |
| mime | TEXT | |
| size_bytes | INTEGER | |
| storage_path | TEXT | under app data dir |
| created_at | TEXT | |

### `worktree`
| col | type | notes |
|-----|------|-------|
| id | TEXT pk | |
| project_id | TEXT fk | |
| branch | TEXT | |
| path | TEXT | `../worktrees/<project>/<feature>` |
| status | TEXT | `active` \| `merged` \| `removed` |
| created_by | TEXT | `user` \| `agent:{run_id}` |
| created_at | TEXT | |

### `agent_run`
| col | type | notes |
|-----|------|-------|
| id | TEXT pk | |
| project_id | TEXT fk | |
| chat_id | TEXT fk (nullable) | originating chat |
| agent_kind | TEXT | `claude` \| `codex` \| custom |
| task | TEXT | the assignment |
| worktree_id | TEXT fk (nullable) | isolated tree |
| branch | TEXT | |
| pr_url | TEXT (nullable) | opened PR |
| status | TEXT | `queued`\|`running`\|`needs_approval`\|`done`\|`failed`\|`cancelled` |
| harness_profile_id | TEXT fk | guardrails applied |
| started_at / ended_at | TEXT | |

### `agent_event`
Append-only log of an agent run (tool calls, approvals, diffs).
| col | type | notes |
|-----|------|-------|
| id | TEXT pk | |
| run_id | TEXT fk | |
| seq | INTEGER | ordering |
| kind | TEXT | `step`\|`tool_call`\|`approval_req`\|`approval_grant`\|`error`\|`pr` |
| payload_json | TEXT | |
| created_at | TEXT | |

### `mcp_server`
| col | type | notes |
|-----|------|-------|
| id | TEXT pk | |
| workspace_id | TEXT fk | |
| name | TEXT | |
| transport | TEXT | `stdio` \| `sse` \| `http` |
| command | TEXT (nullable) | for stdio |
| args_json | TEXT | |
| url | TEXT (nullable) | for sse/http |
| env_keyring_ref | TEXT (nullable) | secret env vars |
| enabled | INTEGER | |
| created_at | TEXT | |

### `plugin`
| col | type | notes |
|-----|------|-------|
| id | TEXT pk | |
| workspace_id | TEXT fk | |
| name / source | TEXT | |
| kind | TEXT | bundled MCP/agent/toolset |
| config_json | TEXT | |
| enabled | INTEGER | |

### `site`
| col | type | notes |
|-----|------|-------|
| id | TEXT pk | |
| project_id | TEXT fk (nullable) | |
| name | TEXT | |
| root_path | TEXT | served/previewed dir |
| dev_command | TEXT (nullable) | |
| url | TEXT (nullable) | local preview URL |
| status | TEXT | `stopped`\|`running`\|`error` |

### `automation`
| col | type | notes |
|-----|------|-------|
| id | TEXT pk | |
| workspace_id | TEXT fk | |
| name | TEXT | |
| trigger_kind | TEXT | `schedule`\|`manual`\|`event` |
| trigger_config_json | TEXT | cron, etc. |
| action_json | TEXT | what to run (prompt/agent/command) |
| enabled | INTEGER | |
| last_run_at | TEXT (nullable) | |

### `automation_run`
| col | type | notes |
|-----|------|-------|
| id | TEXT pk | |
| automation_id | TEXT fk | |
| status | TEXT | `running`\|`success`\|`failed` |
| log_path | TEXT | |
| started_at / ended_at | TEXT | |

### `pinned`
| col | type | notes |
|-----|------|-------|
| id | TEXT pk | |
| workspace_id | TEXT fk | |
| target_kind | TEXT | `chat`\|`project`\|`agent_run`\|`site`\|… |
| target_id | TEXT | |
| position | INTEGER | manual order |
| created_at | TEXT | |

### `harness_profile`
Permission/guardrail presets (see `docs/specs/permissions-guardrails.md`).
| col | type | notes |
|-----|------|-------|
| id | TEXT pk | |
| workspace_id | TEXT fk | |
| name | TEXT | e.g. "Read-only", "Auto-edit", "Full-auto" |
| policy_json | TEXT | tool allow/deny, approval mode, sandbox cfg |
| is_default | INTEGER | |

### `usage_snapshot`
| col | type | notes |
|-----|------|-------|
| id | TEXT pk | |
| account_id | TEXT fk | |
| day | TEXT | `YYYY-MM-DD` |
| tokens_in / tokens_out | INTEGER | |
| requests | INTEGER | |
| cost_estimate_usd | REAL | |
| source | TEXT | `local_tally` \| `api` |

## Migrations

- Plain SQL files in `src-tauri/migrations/NNNN_description.sql`, applied at
  startup via `sqlx::migrate!`.
- Forward-only; never edit an applied migration — add a new one.
- Migrations run inside a transaction; failure aborts startup with a clear error.

## Conventions

- All multi-tenant tables carry `workspace_id`; queries are always scoped to the
  active workspace.
- Soft-delete via `archived`/`status` rather than hard `DELETE` for user content
  (chats, projects). Worktrees and agent runs are hard-removable.
- Every cross-boundary struct derives `ts-rs::TS` so the TS shape matches a row's
  serialized form (see `docs/05-ipc-contract.md`).
