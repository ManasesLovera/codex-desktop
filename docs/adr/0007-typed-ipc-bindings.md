# ADR-0007: Generate TypeScript IPC types from Rust with ts-rs

**Status:** Accepted
**Date:** 2026-06-03
**Deciders:** Project lead

## Context

The Rust core and the TS frontend communicate over a typed IPC surface
(`docs/05-ipc-contract.md`). Hand-maintaining matching types on both sides is
error-prone; drift causes runtime bugs that the compiler can't catch.

## Decision

Define cross-boundary types **once in Rust** (deriving `serde` + `ts-rs::TS`) and
**generate** `src/lib/bindings.ts`. The frontend imports types only from
`bindings.ts`. Generation runs in `build.rs`/a `cargo test` and is checked in CI
(a drift between committed bindings and generated output fails the build).

## Options Considered

### Option A: ts-rs (chosen)
**Pros:** Lightweight; Rust is the single source of truth; simple derive;
generates plain TS types.
**Cons:** Types only (not runtime validation — we add `zod` at the JS edge where
needed); must keep generation wired into the build.

### Option B: specta + tauri-specta
**Pros:** Tauri-aware; can generate command bindings too.
**Cons:** Heavier; more coupling; for v1 we prefer the minimal ts-rs approach and
a thin hand-written `ipc.ts` wrapper.

### Option C: Manual types
**Pros:** No tooling.
**Cons:** Guaranteed drift over time; the exact failure mode we want to avoid.

### Option D: OpenAPI/JSON-Schema codegen
**Pros:** Language-neutral.
**Cons:** Overkill for an in-process IPC; extra schema layer.

## Trade-off Analysis

ts-rs gives us compile-time-consistent types with minimal machinery and keeps
Rust authoritative. Runtime validation is a separate concern handled with `zod`
only at the JS boundary where untrusted input could appear. specta/tauri-specta
is a reasonable future upgrade if we want generated command wrappers too.

## Consequences

- **Easier:** the IPC contract can't silently drift; refactors propagate types.
- **Harder:** must keep generation in the build and commit regenerated bindings;
  contract changes touch Rust + bindings + docs together.
- **Revisit if:** we want full generated command clients (move to tauri-specta).

## Action Items

1. [ ] Derive `TS` on all cross-boundary structs.
2. [ ] Wire generation; output `src/lib/bindings.ts`.
3. [ ] CI check fails on uncommitted binding drift.
4. [ ] `zod` schemas at the JS edge for untrusted inputs.
