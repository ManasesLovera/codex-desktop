# 05 — IPC Contract

The **only** interface between the WebView and the Rust core. Two mechanisms:

1. **Commands** — `invoke("name", args) -> Result<T, AppError>` (request/response).
2. **Events** — `emit("topic", payload)` from Rust, `listen("topic")` in JS
   (push streams).

All payload types are Rust structs deriving `serde` + `ts-rs::TS`; the generated
TypeScript lives in `src/lib/bindings.ts`. **This document and `bindings.ts` must
stay in sync with the code.**

## Conventions

- Command names: `domain_verb` (e.g. `chat_send`, `agent_start`).
- Event topics: `domain:scope:event` (e.g. `chat:{stream_id}:delta`).
- Every command returns `Result<T, AppError>`. Never throw raw.
- Long-running work returns a handle id immediately and streams via events; the
  command itself resolves fast.
- All commands are validated and pass through the harness layer where they touch
  FS/process/network/secrets.

## AppError (shared shape)

```ts
type AppError = {
  code: string;        // machine code, e.g. "auth.invalid_key"
  message: string;     // human-readable
  retriable: boolean;
  details?: unknown;
};
```

## Command surface (by domain)

### Auth
| command | args | returns |
|---------|------|---------|
| `auth_list_accounts` | — | `Account[]` |
| `auth_start_chatgpt_oauth` | — | `{ auth_url, state }` (opens browser) |
| `auth_complete_chatgpt_oauth` | `{ code, state }` | `Account` |
| `auth_save_api_key` | `{ label, key }` | `Account` (key→keyring) |
| `auth_remove_account` | `{ account_id }` | `void` |
| `auth_active_account` | — | `Account \| null` |
| `auth_set_active` | `{ account_id }` | `void` |

### Workspaces
| `workspace_list` · `workspace_create({name})` · `workspace_update` · `workspace_delete` · `workspace_switch({id})` · `workspace_active` |

### Projects
| `project_list({workspace_id})` · `project_add({path})` · `project_remove` · `project_open({id})` · `project_detect_repo({path})` |

### Chats
| command | args | returns |
|---------|------|---------|
| `chat_list` | `{ project_id? }` | `Chat[]` |
| `chat_create` | `{ project_id?, model, mode }` | `Chat` |
| `chat_get` | `{ id }` | `{ chat, messages }` |
| `chat_send` | `{ chat_id, content, attachments? }` | `{ stream_id }` |
| `chat_cancel` | `{ stream_id }` | `void` |
| `chat_edit_message` | `{ message_id, content }` | `{ stream_id }` (re-runs) |
| `chat_rename` / `chat_archive` / `chat_delete` | … | … |

Events: `chat:{stream_id}:delta` (token), `:tool_call`, `:done` (usage),
`:error`.

### Model switching
| `model_list({account_id})` → `Model[]` · `model_set_default({chat_id, model})` · `model_capabilities({model})` |

### Plan mode
| `plan_start({chat_id, goal})` → `{stream_id}` · `plan_approve({chat_id, plan_id})` · `plan_reject({chat_id, plan_id, feedback})` |
Events: `plan:{chat_id}:draft`, `:updated`.

### Terminal (PTY)
| command | args | returns |
|---------|------|---------|
| `pty_open` | `{ cwd, shell?, cols, rows }` | `{ pty_id }` |
| `pty_write` | `{ pty_id, data }` | `void` |
| `pty_resize` | `{ pty_id, cols, rows }` | `void` |
| `pty_close` | `{ pty_id }` | `void` |

Events: `pty:{pty_id}:data`, `pty:{pty_id}:exit`.

### Worktrees
| `worktree_list({project_id})` · `worktree_create({project_id, branch, base?})` · `worktree_remove({id, force?})` · `worktree_status({id})` · `worktree_diff({id})` |

### Agents
| command | args | returns |
|---------|------|---------|
| `agent_start` | `{ project_id, task, agent_kind, harness_profile_id, auto_worktree, auto_pr }` | `{ run_id }` |
| `agent_get` | `{ run_id }` | `AgentRun + events` |
| `agent_list` | `{ project_id? }` | `AgentRun[]` |
| `agent_cancel` | `{ run_id }` | `void` |
| `agent_approve` | `{ run_id, request_id, decision }` | `void` |
| `agent_open_pr` | `{ run_id }` | `{ pr_url }` |

Events: `agent:{run_id}:progress`, `:tool_call`, `:approval_req`, `:diff`,
`:pr`, `:done`, `:error`.

### MCP
| `mcp_list` · `mcp_add({…})` · `mcp_update` · `mcp_remove` · `mcp_enable({id, enabled})` · `mcp_test({id})` → `{tools: McpTool[]}` · `mcp_tools({id})` |
Events: `mcp:{id}:status`, `mcp:{id}:log`.

### Plugins
| `plugin_list` · `plugin_install({source})` · `plugin_enable({id, enabled})` · `plugin_remove` · `plugin_configure({id, config})` |

### Sites
| `site_list` · `site_create({…})` · `site_start({id})` · `site_stop({id})` · `site_status({id})` |
Events: `site:{id}:status`, `site:{id}:log`.

### Automations
| `automation_list` · `automation_create({…})` · `automation_update` · `automation_delete` · `automation_run_now({id})` · `automation_runs({id})` |
Events: `automation:{id}:run`.

### Remote Mobile
| `remote_status` · `remote_enable({enabled})` · `remote_pair()` → `{pairing_code, expires_at}` · `remote_devices()` · `remote_revoke({device_id})` |
Events: `remote:device:connected`, `remote:command`.

### Usage
| `usage_summary({account_id, range})` → `UsageSnapshot[]` · `usage_refresh({account_id})` |

### Settings / Profile
| `settings_get` · `settings_set({patch})` · `profile_get` · `theme_set({theme})` |

### Pinned
| `pinned_list` · `pinned_add({target_kind, target_id})` · `pinned_remove({id})` · `pinned_reorder({order})` |

### File upload
| `file_stage` | `{ chat_id, path }` | `Attachment` (copies into app store) |
| `file_stage_bytes` | `{ chat_id, filename, mime, bytes_b64 }` | `Attachment` |
| `file_remove` | `{ attachment_id }` | `void` |

### Harness / guardrails
| `harness_profiles` · `harness_profile_create({…})` · `harness_profile_update` · `harness_profile_delete` · `harness_set_default({id})` |
Approval flow uses the per-domain `*_approve` commands + `*:approval_req` events.

## Event topic catalog (summary)

```
chat:{stream_id}:{delta|tool_call|done|error}
plan:{chat_id}:{draft|updated}
pty:{pty_id}:{data|exit}
agent:{run_id}:{progress|tool_call|approval_req|diff|pr|done|error}
mcp:{id}:{status|log}
site:{id}:{status|log}
automation:{id}:run
remote:{device:connected|command}
app:{toast|workspace_changed}
```

## Versioning the contract

- Bindings are generated; never hand-edit `bindings.ts`.
- Adding a field: optional first, then required after the UI handles it.
- Removing/renaming a command is a breaking change: update this doc, bindings,
  and all call sites in the same PR.
