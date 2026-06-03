# 11 — Agent Automation Guide

How to build this project with **multiple AI agents running in parallel**, which
**model** to assign to each task, and how to keep parallel work conflict-free.

This guide is the control plane. The per-phase task lists live in
[`docs/agent-plan/`](agent-plan/) (`phase-0.md` … `phase-8.md`) and map 1:1 to the
phases in [`docs/09-implementation-roadmap.md`](09-implementation-roadmap.md).

> **Dogfooding:** we build this app the way the app itself runs agents — each
> task runs in its own git **worktree** at `../worktrees/<project>/<task-slug>`,
> on its own branch, and ends in a **PR** (see `docs/specs/agents.md`,
> `docs/specs/worktrees.md`). The orchestrator routes each task to a model and
> merges PRs at phase sync points.

---

## 1. Model roster

| Model | Provider | Tier | Best for | Cost posture |
|-------|----------|------|----------|--------------|
| **Claude Opus 4.8** | Anthropic | **S** | Architecture, security/guardrails, agent orchestration, concurrency, IPC contract, anything correctness-critical or cross-cutting | Premium — use deliberately |
| **Claude Opus 4.6** | Antigravity | **A** | Complex features needing strong reasoning when Opus 4.8 is busy (providers, streaming, worktree/git logic) | High |
| **Claude Sonnet 4.6** | Anthropic | **A** | Solid feature work: commands, core modules, integration tests, non-trivial UI | Mid — workhorse |
| **Gemini 3.5 Flash** | Antigravity | **B** | Standard UI slices, CRUD commands, component work, docs, straightforward tests | Low — **prefer for easy tasks** |
| **Grok** | Grok Build | **B** | Standard UI/CRUD, glue, fixtures, config, scaffolds | Low — **prefer for easy tasks** |
| **DeepSeek v4 Flash** | OpenCode (free) | **C** | Very minimal: trivial components, type stubs, simple fixtures | Free — **max 1–2 tasks/phase** |
| **MiniMax M3** | OpenCode (free) | **C** | Very minimal: boilerplate, renames, doc tidy | Free — **max 1–2 tasks/phase** |

## 2. Routing policy

Pick the **cheapest model that can do the task correctly**, then escalate only
where correctness/risk demands it.

```
Is the task security-, concurrency-, orchestration-, or contract-critical,
or does it set a pattern many other tasks copy?
        │ yes → Tier S  (Opus 4.8)
        │ no
Does it need real cross-file reasoning, async/streaming, git/provider logic,
or careful integration tests?
        │ yes → Tier A  (Sonnet 4.6; Opus 4.6 if extra reasoning or to parallelize)
        │ no
Is it a standard UI slice, CRUD command, component, doc, or simple test?
        │ yes → Tier B  (Gemini 3.5 Flash or Grok — prefer these for easy work)
        │ no
Is it trivial boilerplate (≤ ~30 lines, no design decisions)?
              → Tier C  (DeepSeek v4 Flash / MiniMax M3) — **≤ 2 per phase total**
```

**Hard rules**
- **Tier S owns the contract.** IPC shapes (`docs/05-ipc-contract.md`), the data
  model, the harness policy engine, and the agent orchestrator are written/owned
  by Opus 4.8. Other tiers consume these, never redefine them.
- **Free tier (C) is capped at 2 tasks per phase** and only for work where a
  wrong result is cheap to catch (no security, no contract, no concurrency).
- **Prefer Gemini 3.5 Flash / Grok over the free tier** for ordinary easy tasks.
- Every Tier B/C PR is **reviewed by a Tier A or S agent** before merge
  (see §7).

## 3. Roles

| Role | Model | Job |
|------|-------|-----|
| **Orchestrator** | Opus 4.8 | Owns this guide; assigns tasks, creates worktrees/branches, sequences phases, resolves cross-task design questions. One per project. |
| **Worker** | per task | Implements exactly one task in its worktree, opens a PR. |
| **Reviewer** | Tier A/S | Reviews PRs for correctness, contract adherence, tests, parity; approves/merges. |
| **Integrator** | Opus 4.8 / Sonnet 4.6 | Runs the phase **sync step**: merges branches in order, resolves conflicts, runs full CI, tags the milestone. |

Orchestrator and Integrator may be the same Opus 4.8 instance.

## 4. Parallelization model

Parallelism is safe only when tasks **don't touch the same files**. We enforce
that with **lanes** = file-ownership boundaries from
[`docs/03-project-structure.md`](03-project-structure.md):

| Lane | Owns | Typical tier |
|------|------|--------------|
| **RUST-CORE** | `src-tauri/src/core/<feature>.rs`, `providers/`, `mcp/`, `harness/` | S / A |
| **RUST-CMD** | `src-tauri/src/commands/<feature>.rs` | A |
| **MIGRATION** | `src-tauri/migrations/*` (serialized — one writer at a time) | A |
| **UI-FEATURE** | `src/features/<feature>/*` | B (A if complex) |
| **UI-SHARED** | `src/components/*`, `src/styles/*` | B / S-for-tokens |
| **TESTS** | `tests/*`, `*.test.ts`, integration tests | A / B |
| **DOCS/CI** | `docs/*`, `.github/*`, `scripts/*` | B / C |

**Rules**
1. Two tasks may run in parallel **iff** their lanes/paths don't overlap.
2. `MIGRATION` is a single-writer lane: only one migration-adding task in flight;
   others depend on it.
3. Shared contract files (`bindings.ts` generated, `05-ipc-contract.md`,
   `04-data-model.md`) are changed by the **owning** task only; consumers wait
   for it to merge (a dependency edge), they don't edit it.
4. A task lists `depends_on`. The orchestrator only dispatches a task once its
   deps are merged.
5. Each phase ends with a **sync step** (integration + full CI) before the next
   phase starts. Phases are mostly sequential; tasks **within** a phase run in
   parallel lanes.

### Parallel-wave pattern (per phase)

```
Wave 1: contract/core tasks (Tier S/A)         ─┐
        e.g. data model, commands, core module   │ merge → sync
Wave 2: consumers in parallel lanes (B/A)       ─┤  (depend on Wave 1)
        UI slices, tests, docs                    │
Wave 3: integration + e2e + parity (A/S)        ─┘  phase sync step
```

## 5. Shared prompt preamble (give to EVERY worker)

Every task prompt is **preamble + task block**. The preamble is constant:

```
You are a worker agent building "Codex Desktop (Tauri Edition)": a RAM/CPU-
efficient, pixel-perfect Linux clone of OpenAI's Codex Desktop, built with
Tauri 2 + Rust + React/TS (NOT Electron). Efficiency and visual parity are
hard requirements.

Before coding, READ:
- CLAUDE.md (rules — these are binding)
- docs/01-architecture.md, docs/03-project-structure.md
- docs/05-ipc-contract.md and docs/04-data-model.md (the contract — do NOT change
  unless this task explicitly owns it)
- the spec(s) named in your task block under docs/specs/
- docs/06-security-guardrails.md if your task touches fs/shell/network/secrets/agents

Hard constraints:
- The WebView is untrusted: no secrets, no FS, no shell, no raw network in JS.
  All privileged work is a typed #[tauri::command] in Rust.
- Stay strictly within the FILES YOU OWN (listed in your task). Do not edit files
  owned by other tasks; if you need a change there, note it in your PR instead.
- Match the IPC/data-model contracts exactly. If your task owns a contract change,
  update the doc AND regenerate bindings in the same PR.
- Tests ship with the feature (see docs/07-testing-strategy.md and your spec's
  test list). A task is not done without them.
- Follow conventions in docs/03-project-structure.md. Comments explain WHY only.

Workflow:
- Work in your assigned git worktree/branch only.
- Run the quality gates in README.md before opening the PR.
- Open a PR titled "[<phase>] <task-id>: <title>" with a summary, the files
  touched, how you tested, and any cross-task notes. Do not merge your own PR.
```

## 6. Task definition schema

Each task in `docs/agent-plan/phase-*.md` is specified as:

```
### <task-id> — <title>
- Model: <tier + model>            # routing decision
- Lane: <lane>                     # file-ownership boundary
- Owns (files): <globs>            # the ONLY files this task may edit
- Depends on: <task-ids | none>    # dispatch only after these merge
- Parallel with: <task-ids>        # safe concurrent siblings
- Context to read: <docs/specs/...>
- Prompt: <the task-specific instructions appended to the preamble>
- Definition of done: <objective, testable checklist>
```

The orchestrator copies **preamble + Prompt** to the worker, opens the worktree,
and tracks the PR.

## 7. Review & merge protocol

1. Worker opens a PR; CI runs all gates (`docs/08-ci-cd.md`).
2. **Reviewer** (Tier A/S; never the author's own model for Tier C work) checks:
   correctness, contract adherence, test presence/quality, security boundaries,
   visual parity for UI, and that only owned files changed.
3. Tier S reviews anything touching contracts, security, concurrency, or agents —
   regardless of who wrote it.
4. Merge order within a wave follows `depends_on`. Conflicts are resolved by the
   **Integrator**, never by force-push over someone else's branch.
5. **Phase sync step:** Integrator merges all phase branches, runs full CI +
   e2e + perf-smoke + visual regression, fixes integration gaps, tags the
   milestone (`docs/09-implementation-roadmap.md`). Only then does the next phase
   dispatch.

## 8. Conflict-avoidance cheatsheet

- One writer per file, ever, within a wave (enforced by lanes).
- `MIGRATION` and generated `bindings.ts` are serialized dependency chokepoints.
- New shared UI primitives: create them in a dedicated UI-SHARED task **first**;
  feature tasks consume them afterward (dependency edge), never create duplicates.
- If a worker discovers it needs a file it doesn't own: stop, note it in the PR /
  back to the orchestrator — do **not** reach across lanes.

## 9. Quick-reference: tasks → model (per phase totals)

Counts are guidance; exact tasks are in the phase files.

| Phase | Tier S (Opus 4.8) | Tier A (Sonnet 4.6 / Opus 4.6) | Tier B (Gemini Flash / Grok) | Tier C (free, ≤2) |
|-------|-------------------|--------------------------------|------------------------------|-------------------|
| 0 Scaffolding | capabilities/CSP, IPC+bindings pipeline | sqlx+AppState, CI | Vite/Tailwind setup, README polish | 1: tokens stub |
| 1 Auth/WS/Projects/Settings | auth/keyring/PKCE, LlmProvider | workspaces, projects, settings layering, commands | onboarding UI, settings UI | 1–2: forms/scaffold |
| 2 Chats/Models/Files/Plan | streaming engine + plan harness hook | model switching, file staging, chat commands | transcript/composer UI, model picker UI | 1: attachment chip |
| 3 Terminal/Worktrees/Panel | worktree path+git logic | PTY backend, review-diff core | terminal UI, panel shell, diff viewer UI | 1: tab component |
| 4 Harness/Agents | **harness engine + agent orchestrator + PR flow** | agent commands, sandbox, approval UI wiring | agent timeline UI, profile editor UI | 0 |
| 5 MCP/Plugins | MCP host + tool routing | plugin manifest/install, commands | MCP/plugin manager UI | 1: fixtures |
| 6 Sites/Automations/Pinned/Usage | (review only) | sites runner, automation scheduler, usage refresh | sites/automation/pinned/usage UI, browser tab | 1–2: pinned UI, price table |
| 7 Remote Mobile | transport ADR + pairing/crypto + harness binding | device mgmt commands | remote settings UI | 0 |
| 8 Parity/Release | perf tuning, security audit | packaging, release pipeline | visual-regression baselines, empty/error states | 1–2: icon/doc tidy |

See each `docs/agent-plan/phase-N.md` for the exact task list, prompts, file
ownership, dependencies, and parallel waves.
