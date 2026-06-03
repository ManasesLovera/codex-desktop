# ADR-0001: Use Tauri 2 (not Electron) for the desktop shell

**Status:** Accepted
**Date:** 2026-06-03
**Deciders:** Project lead (Senior Rust Desktop Dev)

## Context

We are building a Linux-native clone of OpenAI's Codex Desktop. The existing
Linux option repackages OpenAI's Electron build, which idles at 300–600 MB RAM
and ships a 120–250 MB bundle. The explicit product goal is a **RAM/CPU-efficient**
app with identical UI and full feature set (see `docs/00-vision-scope.md`).

Forces:
- Memory/CPU efficiency is the reason the project exists.
- We need a rich, web-tech UI to achieve pixel parity quickly.
- We want all privileged logic in a fast, safe systems language.
- Linux-only shipping (but keep the design portable).

## Decision

Use **Tauri 2** with a **Rust** core and a web (React/TS) frontend rendered in
the OS-native WebView (WebKitGTK on Linux).

## Options Considered

### Option A: Tauri 2 (chosen)
| Dimension | Assessment |
|-----------|------------|
| Memory | Excellent — native WebView, no bundled Chromium |
| Bundle size | Excellent — tens of MB |
| UI velocity | High — standard web stack |
| Security | Strong — capability model, no ambient JS privileges |
| Rust core | First-class |
| Cross-engine consistency | Moderate — WebKitGTK varies by distro |

**Pros:** Meets the core efficiency goal; Rust backend; small bundle; strong
security model.
**Cons:** WebKitGTK is less uniform than Chromium; some web APIs differ; smaller
ecosystem than Electron.

### Option B: Electron
| Dimension | Assessment |
|-----------|------------|
| Memory | Poor — the problem we're solving |
| Bundle size | Poor |
| UI velocity | High |
| Security | Weaker defaults |

**Pros:** Maximum web compatibility; huge ecosystem; what the original uses.
**Cons:** Defeats the entire purpose (RAM/CPU/bundle).

### Option C: Native toolkit (GTK-rs / Slint / Iced)
**Pros:** Lowest memory; fully native.
**Cons:** Pixel-perfect parity with a complex web-styled UI would be very slow to
build and hard to keep matching; weak ecosystem for chat/markdown/terminal/diff.

### Option D: Wails (Go + WebView)
**Pros:** Similar efficiency profile to Tauri.
**Cons:** Go core instead of Rust; smaller desktop ecosystem; we prefer Rust for
the systems-level work (PTY, git, sandbox).

## Trade-off Analysis

Tauri uniquely satisfies the non-negotiable efficiency goal *and* the
web-tech-for-parity goal *and* gives us a Rust core. Its main risk —
WebKitGTK inconsistency — is mitigated by conservative CSS, feature detection,
and e2e tests on the real engine. Native toolkits would jeopardize the parity
requirement; Electron jeopardizes the entire premise.

## Consequences

- **Easier:** low memory, small bundle, secure-by-default IPC, Rust backend.
- **Harder:** must test against WebKitGTK (not Chromium); some polyfills/feature
  detection; team must know Rust.
- **Revisit if:** WebKitGTK proves unable to hit pixel parity for a critical
  surface (then consider an embedded Chromium only for that surface).

## Action Items

1. [ ] Scaffold Tauri 2 app (`docs/09-implementation-roadmap.md` Phase 0).
2. [ ] Lock down capabilities/CSP per `docs/06-security-guardrails.md`.
3. [ ] Add WebKitGTK e2e in CI (`docs/08-ci-cd.md`).
4. [ ] Establish the RAM/startup perf smoke benchmark vs targets.
