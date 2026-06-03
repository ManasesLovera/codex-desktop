# Phase 8 — Parity Hardening & Release (agent task plan)

**Goal:** pixel-parity verified across all screens, performance comfortably within
targets, security audited, and reproducible installable artifacts shipped.

Specs: [`../10-ui-ux-layout.md`](../10-ui-ux-layout.md),
[`../00-vision-scope.md`](../00-vision-scope.md), [`../08-ci-cd.md`](../08-ci-cd.md).
Routing: [`../11-agent-automation-guide.md`](../11-agent-automation-guide.md).

## Wave plan

```
Wave 1 (parallel, independent surfaces):
  P8-T1 visual-regression baselines(B)  P8-T2 empty/loading/error states(B)
  P8-T3 keyboard shortcuts + command palette(A)  P8-T7 icon/doc tidy(C)
Wave 2 (after parity work lands):
  P8-T4 perf tuning + leak checks(S)  P8-T5 security audit(S)
Wave 3: P8-T6 packaging + release pipeline(A)
Sync: P8-S (final release gate)
```

---

### P8-T1 — Visual-regression baselines (all screens)
- Model: **Tier B — Gemini 3.5 Flash**
- Lane: TESTS (`tests/visual/**`)
- Owns: `tests/visual/**`, screenshot baselines
- Depends on: Phases 1–7 features · Parallel with: P8-T2,P8-T3,P8-T7
- Context: `docs/07-testing-strategy.md` §5, `docs/10-ui-ux-layout.md`
- Prompt: "Set up deterministic visual-regression tests (seeded data, animations
  off) capturing every key screen at 100/125/150% × light/dark, and wire the
  pixel-diff into CI (fail above threshold, upload before/after). Capture
  baselines and flag any screen that deviates from the parity checklist in
  docs/10-ui-ux-layout.md."
- DoD: baselines for all screens; CI visual job enforces threshold.

### P8-T2 — Empty/loading/error states
- Model: **Tier B — Grok**
- Lane: UI-FEATURE (touches multiple feature dirs — coordinate; small per-file)
- Owns: empty/error/skeleton components per feature (declare exact files in PR)
- Depends on: Phases 1–7 · Parallel with: P8-T1,P8-T3,P8-T7
- Context: `docs/10-ui-ux-layout.md` (states), each spec
- Prompt: "Audit every view for empty/loading/error states matching Codex's tone
  (skeletons where Codex uses them, not spinners). Add the missing ones. Keep
  changes additive and per-file to avoid conflicts; list touched files in the PR."
- DoD: every view has matching empty/loading/error states.

### P8-T3 — Keyboard shortcuts + command palette
- Model: **Tier A — Sonnet 4.6**
- Lane: UI app shell (`src/app/command-palette/**`, shortcut registry)
- Owns: `src/app/command-palette/**`, `src/lib/hooks/useShortcuts.ts`
- Depends on: Phases 1–7 · Parallel with: P8-T1,P8-T2,P8-T7
- Context: `docs/10-ui-ux-layout.md` (command palette)
- Prompt: "Implement the Ctrl/Cmd-K command palette (switch chats/projects/
  workspaces, run commands, start agents, change model, toggle panels; fuzzy
  search) and a global shortcut registry matching Codex. Tests for palette
  search + a few shortcuts."
- DoD: palette + shortcuts match Codex; tested.

### P8-T4 — Performance tuning + leak checks
- Model: **Tier S — Opus 4.8** (owns the efficiency goal)
- Lane: cross-cutting (perf-targeted edits; coordinate via PR notes)
- Owns: perf-smoke harness `tests/perf/**` + targeted optimizations
- Depends on: P8-T1..T3 merged · Parallel with: P8-T5
- Context: `docs/00-vision-scope.md` (targets), `docs/07-testing-strategy.md` §6
- Prompt: "Profile the built app against the targets in docs/00-vision-scope.md
  (idle RAM ≤150MB, per-tab ≤15MB, cold start ≤1.5s, idle CPU ~0%, bundle
  ≤20MB). Fix regressions: virtualization, lazy mounting, no idle timers, bundle
  trimming/code-splitting. Add a memory-leak check (open/close many chats/
  terminals/agents). Make the CI perf-smoke fail outside targets+tolerance."
- DoD: all perf targets met with margin; leak check clean; CI enforces.

### P8-T5 — Security audit
- Model: **Tier S — Opus 4.8**
- Lane: TESTS + review (`tests/security/**`)
- Owns: `tests/security/**`, audit report `docs/security-audit.md`
- Depends on: Phases 1–7 · Parallel with: P8-T4
- Context: `docs/06-security-guardrails.md`, all security-relevant specs
- Prompt: "Run a full security audit against docs/06-security-guardrails.md:
  assert no secret in DB/logs/events/WebView; harness non-bypass + no confinement
  escape (fuzz fs/shell/path) under every profile incl. Full-auto; CSP/capability
  lockdown; MCP/plugin/remote boundaries; `cargo deny` + `npm audit`. Write
  docs/security-audit.md with findings + resolutions. File issues for anything
  unresolved (must be empty to ship)."
- DoD: audit passes; report committed; no open critical/high findings.

### P8-T6 — Packaging + release pipeline
- Model: **Tier A — Sonnet 4.6**
- Lane: DOCS/CI + packaging (`.github/workflows/release.yml`, `packaging/**`, `flake.nix`)
- Owns: `.github/workflows/release.yml`, `packaging/arch/PKGBUILD`, `flake.nix`
- Depends on: app builds (Phase 0+) · Parallel with: none (Wave 3)
- Context: `docs/08-ci-cd.md` (Packaging)
- Prompt: "Finalize packaging per docs/08-ci-cd.md: `tauri build` →
  `.deb`/`.rpm`/AppImage; Arch `PKGBUILD`; Nix flake (package + dev shell). A
  tag-triggered release job builds all bundles, generates SHA256 checksums
  (+optional GPG), creates a GitHub Release with artifacts + changelog. Smoke-
  install `.deb` (Ubuntu) and validate `.rpm` (Fedora container) in CI."
- DoD: tagging produces installable, checksummed artifacts for all targets.

### P8-T7 — Icon set + doc tidy
- Model: **Tier C — DeepSeek v4 Flash** (free; cosmetic)
- Lane: UI-SHARED + DOCS (`src/components/ui/icons/**`, doc fixups)
- Owns: `src/components/ui/icons/**`, minor doc edits (list in PR)
- Depends on: none · Parallel with: Wave 1
- Context: `docs/10-ui-ux-layout.md` (iconography)
- Prompt: "Replicate Codex's icon set (lucide base + custom where needed) as a
  tidy icon module, and fix any stale cross-references in docs. Cosmetic only; no
  logic."
- DoD: icons consistent with Codex; docs links valid.

---

## Phase 8 sync step (P8-S) — release gate
- Model: **Tier S — Opus 4.8** (Integrator). Tier S signs off P8-T4 and P8-T5.
- Merge order: T1,T2,T3,T7 → T4,T5 → T6.
- Final gate (all must be green): full CI + e2e + **visual regression** (parity
  at 100/125/150 × light/dark) + **perf-smoke within targets** + **security audit
  clean** + reproducible `.deb`/`.rpm`/AppImage/Arch/Nix artifacts with
  checksums. Tag **v1**.
- Exit: pixel-parity verified; all CI layers green; reproducible installable
  artifacts; v1 release. (Roadmap Phase 8 exit.)
