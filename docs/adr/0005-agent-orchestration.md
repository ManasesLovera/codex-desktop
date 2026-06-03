# ADR-0005: Agent orchestration — worktree isolation + git CLI/libgit2 for PRs

**Status:** Accepted
**Date:** 2026-06-03
**Deciders:** Project lead

## Context

Agents must run autonomously, in parallel, each isolated, and each open a PR on a
new branch in the same repo (`docs/specs/agents.md`, `docs/specs/worktrees.md`).
We need isolation, safe git operations, and PR creation, all under the harness
(`docs/specs/permissions-guardrails.md`).

## Decision

- Each agent run gets its **own git worktree** at
  `../worktrees/<project>/<feature>` on a new branch — the unit of isolation.
- Git operations use **libgit2 (`git2`)** for in-process work (worktree add/
  remove, branch, diff, commit) with a **git CLI fallback** where libgit2 is
  awkward (notably `worktree` ergonomics and auth-bearing `push`).
- PRs are opened via the **`gh` CLI** when available, else the git host **REST
  API** (token from keyring).
- The orchestrator is a Rust state machine driving the agent loop; every action
  passes `harness::evaluate`.

## Options Considered

### Isolation

**A. Git worktrees (chosen)** — true filesystem + branch isolation, cheap, native
git. Enables parallel agents trivially.
**B. Full clones per agent** — heavier (disk, time), redundant.
**C. Single checkout + locking** — no real isolation; parallel agents would
collide.

### Git library

**A. libgit2 + CLI fallback (chosen)** — fast in-process for most ops; CLI for
worktree/push/auth edge cases that libgit2 handles poorly.
**B. Pure-Rust `gix` only** — promising but worktree/push maturity risk for v1.
**C. Git CLI only** — simplest, but parsing/porcelain fragility and more process
spawns.

### PR creation

**A. `gh` then REST fallback (chosen)** — `gh` is robust and common; REST covers
its absence.
**B. REST only** — more code per host; no `gh` convenience.

## Trade-off Analysis

Worktrees are the natural primitive for the exact requirement ("worktree per
project at `../worktrees/...`", parallel agents, PR per branch). A hybrid git
approach gets libgit2 speed without fighting its weaker spots. `gh`-first PR
creation matches developer environments while staying functional without it.

## Consequences

- **Easier:** parallel isolated agents; clean PR-per-branch flow; main checkout
  never touched.
- **Harder:** must manage worktree lifecycle/cleanup; two git code paths to test;
  PR auth via keyring token.
- **Revisit if:** `gix` matures enough to drop libgit2/CLI; if a host other than
  GitHub becomes primary (generalize the PR adapter).

## Action Items

1. [ ] Worktree manager enforcing the path convention + cleanup.
2. [ ] Git adapter (libgit2 + CLI fallback) with a thin trait.
3. [ ] PR adapter: `gh` detection + REST fallback; token from keyring.
4. [ ] Orchestrator state machine with harness gating + parallel-run isolation
       tests.
