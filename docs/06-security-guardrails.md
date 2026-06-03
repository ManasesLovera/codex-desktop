# 06 — Security Model & Guardrails

Security is foundational because this app runs agents that can edit files, run
shell commands, hit the network, and open PRs. The model has three layers:
**isolation**, **the harness policy engine**, and **secret handling**.

## 1. Isolation: the WebView is untrusted

- Tauri capabilities/allowlist expose **no** `fs`, `shell`, or `http` plugins to
  JS. Every privileged action is a custom Rust command.
- CSP is strict: no remote script, no `eval`, no inline handlers. Only the
  bundled assets and explicitly allowlisted asset/`ipc` schemes load.
- The WebView never receives API keys or OAuth tokens. LLM requests are made by
  Rust; only rendered content/tokens flow back.
- External links open in the system browser, not in-app, unless explicitly part
  of a sandboxed side-panel browser view (see `docs/specs/side-panel.md`).

## 2. The harness policy engine

Every agent/terminal/file/network action a *model* wants to take is mediated by a
**harness profile** (`harness_profile` table). A profile is `policy_json`:

```jsonc
{
  "approval_mode": "auto" | "on_write" | "always" | "never",
  "fs": {
    "read":  ["<repo>", "<worktree>"],     // allowlisted roots
    "write": ["<worktree>"],               // writes confined to worktree by default
    "deny":  ["~/.ssh", "~/.aws", "**/.env", "<repo>/.git/config"]
  },
  "shell": {
    "mode": "deny" | "allowlist" | "confirm" | "allow",
    "allow": ["git", "npm", "cargo", "ls", "cat", "rg"],
    "deny":  ["rm -rf /", "curl | sh", "sudo", ":(){:|:&};:"]
  },
  "network": { "mode": "deny" | "allowlist" | "allow", "allow": ["api.openai.com", "github.com"] },
  "git": { "push": false, "open_pr": false, "force_push": false },
  "sandbox": { "kind": "none" | "bubblewrap", "no_net_in_sandbox": true }
}
```

### Built-in profiles (mirror Codex)

| Profile | Reads | Writes | Shell | Net | PR | Approval |
|---------|-------|--------|-------|-----|----|----------|
| **Read-only** | repo | none | deny | deny | no | always |
| **Suggest** | repo | none (diffs only) | deny | deny | no | always |
| **Auto-edit** | repo+wt | worktree | allowlist | allowlist | no | on_write |
| **Agent (PR)** | repo+wt | worktree | allowlist | allowlist | yes | on_write |
| **Full-auto** | repo+wt | worktree | allow | allowlist | yes | never |

The active profile is shown in the UI at all times (matching Codex's permission
indicator). Switching to a more permissive profile requires explicit user action.

### Approval gates

When `approval_mode` requires it, the agent **pauses** and emits
`agent:{run_id}:approval_req` with the pending action (command, diff, network
target). The UI renders an approve/deny prompt; the decision returns via
`agent_approve`. No privileged action proceeds without resolution. Timeouts
default to deny.

### Enforcement point

Guardrails are enforced **in Rust**, at the boundary where the action executes —
never in the UI and never by trusting the model's claims. The flow:

```
model proposes action ─▶ harness::evaluate(profile, action)
   ├─ deny      → reject, log agent_event(kind=error)
   ├─ confirm   → emit approval_req, await agent_approve
   └─ allow     → execute under sandbox, log agent_event(tool_call)
```

## 3. Filesystem confinement

- Agent writes are confined to the worktree path
  (`../worktrees/<project>/<feature>`) by default. Repo-root writes require an
  explicit profile change.
- A deny-list always wins (`.git/config`, `.env`, SSH/cloud creds) even under
  Full-auto.
- Path checks canonicalize and reject traversal/symlink escapes before any op.

## 4. Shell & process safety

- Commands run through a parsed allow/deny evaluation, not naive substring match
  where avoidable; obvious destructive patterns are hard-blocked.
- Optional **bubblewrap** sandbox (`bwrap`) for shell/agent execution: bind-mount
  only the worktree, drop network when policy says so. Degrades gracefully if
  `bwrap` is unavailable (falls back to confirm mode + deny-list).
- All child processes are tracked and killed on cancel/close. No orphans.

## 5. Network safety

- Provider calls (OpenAI/ChatGPT) always allowed for the app itself.
- *Agent-initiated* network access follows the profile's network policy.
- MCP servers declare their transport; stdio servers inherit the sandbox,
  remote (SSE/HTTP) servers are allow-listed by URL.

## 6. Secret handling

- API keys & OAuth tokens: **OS keyring only** (`keyring` crate → Secret
  Service/kwallet). DB stores only a `keyring_ref`, never the secret.
- Tokens never logged, never sent to the WebView, redacted in any error/trace.
- OAuth uses **PKCE**; refresh handled in Rust; on logout the keyring entry is
  deleted.
- MCP server secret env vars also go to the keyring (`env_keyring_ref`).

## 7. Remote Mobile security

- Disabled by default. Pairing uses a short-lived code; sessions are
  authenticated and end-to-end encrypted (see `docs/specs/remote-mobile.md`).
- Remote commands are subject to the **same** harness profile as local ones — a
  phone cannot exceed the active guardrails. Sensitive approvals can be forced to
  require local confirmation.

## 8. Audit & transparency

- Every privileged action is recorded as an `agent_event`/log entry with enough
  detail to review what happened (command, paths, diff hash, approval decision).
- A per-run timeline is viewable in the UI (review-changes side panel).
- No external telemetry by default; opt-in crash reporting only, with secrets
  scrubbed.

## 9. Supply chain / build integrity

- Dependencies pinned; `cargo deny` + `npm audit` run in CI (`docs/08-ci-cd.md`).
- Plugins/MCP servers are user-installed and run with the same guardrails; the UI
  clearly labels third-party code and what it can access before enabling.

## Threat model (summary)

| Threat | Mitigation |
|--------|-----------|
| Malicious/buggy agent deletes files | FS confinement + deny-list + approval gates |
| Prompt injection → exfiltrate secrets | Secrets never in WebView/model context; network allow-list |
| Compromised MCP server | Sandbox + transport allow-list + explicit enable |
| Token theft | Keyring storage, redaction, no plaintext on disk |
| Remote takeover via mobile | Off by default, paired+encrypted, bounded by harness |
| Destructive shell command | Parsed deny-list + sandbox + confirm mode |
