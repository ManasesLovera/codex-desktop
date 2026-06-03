# ADR-0006: React 18 + TypeScript for the frontend

**Status:** Accepted
**Date:** 2026-06-03
**Deciders:** Project lead

## Context

The UI must be a pixel-perfect clone of a large, complex app (chat transcript,
terminal, diff/review, panels, command palette) rendered in WebKitGTK. Heavy
logic lives in Rust, so the frontend's job is rendering + interaction. We want
fast development, a deep component/integration ecosystem, and lean runtime cost.

## Decision

Use **React 18 + TypeScript + Vite**, with **Zustand** (UI state) and
**TanStack Query** (command-backed data). Keep it lean: virtualized lists,
code-splitting per feature, no Redux/MobX.

## Options Considered

### Option A: React 18 + TS (chosen)
| Dimension | Assessment |
|-----------|------------|
| Ecosystem (terminal/markdown/diff/virtualization) | Best |
| Parity velocity | High |
| Runtime cost | Acceptable (work is in Rust; rendering throttled) |
| Familiarity (incl. AI tooling) | Highest |

**Pros:** Richest ecosystem for the exact widgets we need; fastest path to
parity; easiest to staff and to get AI assistance with.
**Cons:** Heavier runtime than Solid/Svelte; must be disciplined about
re-renders.

### Option B: SolidJS
**Pros:** Excellent runtime perf, fine-grained reactivity, small.
**Cons:** Smaller ecosystem for complex widgets; slower to reach pixel parity;
the perf edge is largely moot here since Rust does the heavy lifting and we
throttle streaming renders.

### Option C: Svelte
**Pros:** Compiler-driven, small output, ergonomic.
**Cons:** Ecosystem for our specific widgets less mature than React; team
familiarity lower.

## Trade-off Analysis

Because the backend owns the heavy work and streaming is event-throttled to one
update per frame, the runtime gap between React and Solid/Svelte is not
meaningful for our footprint targets — those are dominated by the WebView itself
(addressed by ADR-0001). The dominant factor is *velocity and ecosystem* for
achieving and maintaining pixel parity, where React wins.

## Consequences

- **Easier:** building/maintaining the complex UI; integrating xterm.js,
  CodeMirror/Monaco, markdown, virtualization.
- **Harder:** must enforce render discipline (memoization, virtualization,
  code-splitting) to protect the efficiency goal.
- **Revisit if:** profiling shows React runtime is a real contributor to missing
  perf targets (then consider Solid for hot surfaces).

## Action Items

1. [ ] Vite + React + TS scaffold with `@/` alias and strict mode.
2. [ ] Zustand + TanStack Query baseline; no Redux.
3. [ ] Virtualize transcript/lists; throttle streaming to one update/frame.
4. [ ] Per-feature code-splitting.
