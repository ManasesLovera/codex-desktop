# 08 — CI/CD & Packaging

CI guarantees the project always builds, passes all test layers, meets perf
targets, and produces installable Linux artifacts. Runner: GitHub Actions
(Linux); adaptable to GitLab CI.

## Pipeline overview

```
PR / push
  ├─ lint-and-typecheck   (fast, fail early)
  ├─ rust-checks          (fmt, clippy -D warnings, deny)
  ├─ bindings-drift       (ts-rs output matches committed bindings.ts)
  ├─ test-rust            (unit + integration; SQLite/git/PTY/mock servers)
  ├─ test-frontend        (vitest)
  ├─ build-app            (tauri build; uploads bundle artifacts)
  ├─ test-e2e             (tauri-driver on WebKitGTK, headless via xvfb)
  ├─ test-visual          (screenshot regression)
  ├─ perf-smoke           (startup/RAM/CPU vs targets)
  └─ security             (cargo deny, npm audit, secret-leak assertions)
release (tag)
  └─ package-and-publish  (.deb, .rpm, .AppImage, PKGBUILD; checksums; release)
```

`lint-and-typecheck`, `rust-checks`, `bindings-drift` run first and gate the
rest. Heavy jobs run in parallel after.

## Jobs (detail)

### lint-and-typecheck
```bash
npm ci
npm run typecheck
npm run lint
npm run format:check
```

### rust-checks
```bash
cargo fmt   --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo deny check        # licenses + advisories
```

### bindings-drift
```bash
# regenerate ts-rs bindings and fail if they differ from committed output
cargo test --manifest-path src-tauri/Cargo.toml export_bindings
git diff --exit-code src/lib/bindings.ts
```

### test-rust
- System deps installed (WebKitGTK et al. — see README).
- Runs unit + integration; integration uses temp SQLite/git/PTY and `wiremock`
  for providers and a fake git host.

### test-frontend
```bash
npm test -- --run --coverage
```

### build-app
```bash
npm ci
npm run tauri build
# upload src-tauri/target/release/bundle/** as CI artifacts
```

### test-e2e
- Needs the built app + `tauri-driver` + a WebDriver client, run under `xvfb`
  (headless WebKitGTK). App launched in **test mode** (mock providers/hosts, temp
  data dir) for determinism.

### test-visual
- Deterministic render mode (seeded data, animations off); pixel-diff against
  stored baselines at 100/125/150% × light/dark. Diffs above threshold fail and
  upload before/after images.

### perf-smoke
- Launch built app; measure cold-start-to-interactive, idle RAM, idle CPU; fail
  if outside the `docs/00-vision-scope.md` targets + tolerance. Trend recorded.

### security
- `cargo deny`, `npm audit --omit=dev`, plus targeted tests asserting no secret
  leaks (DB/logs/events/WebView) and harness non-bypass.

## Caching & matrix

- Cache: cargo registry/target (`Swatinem/rust-cache`), npm, and Tauri build
  cache.
- Node matrix: 20 + 24. Rust: stable (pin MSRV check separately).
- Distro: build/test on Ubuntu LTS; smoke-install `.deb` there;
  `.rpm` validated in a Fedora container; AppImage runs under `xvfb`.

## Packaging

`npm run tauri build` produces, in `src-tauri/target/release/bundle/`:

| Format | Target distros |
|--------|----------------|
| `.deb` | Debian/Ubuntu |
| `.rpm` | Fedora/openSUSE |
| `.AppImage` | portable |

Arch `.pkg.tar.zst` is built from a `PKGBUILD` in `packaging/arch/` (sources the
release tarball, depends on `webkit2gtk-4.1`, `gtk3`, etc.). NixOS users get a
flake (`flake.nix`) exposing the package + dev shell (optional, mirrors the
reference project's Nix support).

### Release job (on tag `v*`)
1. Build all bundles.
2. Generate SHA256 checksums + (optional) GPG signatures.
3. Create a GitHub Release; attach artifacts + checksums + changelog.
4. (Optional) push AppImage update metadata for an in-app updater.

## Branch protection

- `main` requires: all gating jobs green, ≥1 review, up-to-date branch.
- No direct pushes to `main`; agents/users open PRs (matches `docs/specs/agents.md`).
- No `--no-verify`; CI re-runs hooks server-side.

## Local pre-PR (mirror CI)

```bash
npm run typecheck && npm run lint && npm run format:check && npm test
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
npm run test:e2e
```
