# Codex Desktop (Tauri Edition)

A RAM- and CPU-efficient, native **Linux** desktop clone of OpenAI's Codex
Desktop app — built with **Tauri 2 + Rust + React**, not Electron.

> **Why?** Electron bundles a full Chromium per app and idles at 300–600 MB.
> This build uses the OS-native WebView (WebKitGTK) and a Rust core, targeting an
> ~80–150 MB idle footprint with the **same UI and full feature set**.

This repository is currently **spec-first**: the implementation is driven by the
documentation in [`docs/`](docs/). Start with [`CLAUDE.md`](CLAUDE.md) and
[`docs/09-implementation-roadmap.md`](docs/09-implementation-roadmap.md).

---

## Status

| | |
|---|---|
| Phase | **0 — scaffolding** (initial template + layout complete; see roadmap) |
| Platform | Linux (X11 + Wayland via WebKitGTK) |
| License | TBD |

---

## Prerequisites

### System packages (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install -y \
  build-essential curl wget file pkg-config \
  libwebkit2gtk-4.1-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libgtk-3-dev
```

Fedora:

```bash
sudo dnf install -y \
  webkit2gtk4.1-devel openssl-devel curl wget file \
  libappindicator-gtk3-devel librsvg2-devel gtk3-devel \
  @c-development
```

Arch:

```bash
sudo pacman -S --needed \
  webkit2gtk-4.1 base-devel curl wget file openssl \
  libayatana-appindicator librsvg gtk3
```

### Toolchains

| Tool | Version | Install |
|------|---------|---------|
| Rust | stable ≥ 1.77 | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Node.js | ≥ 20 (repo tested on 24) | use `nvm`/`fnm`, or distro package |
| Tauri CLI | 2.x | `cargo install tauri-cli --locked` (or `npm i -D @tauri-apps/cli`) |
| git | ≥ 2.30 | distro package (worktrees require ≥ 2.5) |

Verify:

```bash
rustc --version && cargo --version && node --version && cargo tauri --version
```

---

## Setup

```bash
git clone <this-repo> codex-desktop
cd codex-desktop
npm install          # installs frontend deps (and @tauri-apps/cli if used)
```

> Phase 0 initial scaffolding is complete: `src/` (React frontend) and `src-tauri/` (Rust core) were created with `npm create tauri-app@latest -- --template react-ts` and reorganized to match [`docs/03-project-structure.md`](docs/03-project-structure.md). Continue with the remaining Phase 0 items in [`docs/09-implementation-roadmap.md`](docs/09-implementation-roadmap.md) (SQLite + sqlx, ts-rs bindings, typed IPC, CI, etc.).

---

## Run (development)

```bash
npm run tauri dev
```

This starts the Vite dev server (frontend hot-reload) and compiles the Rust core
with file-watching. The window opens automatically.

### Authentication on first run

The app supports **two** auth methods (see [`docs/specs/auth.md`](docs/specs/auth.md)):

1. **Sign in with ChatGPT** — OAuth PKCE flow; tokens stored in the OS keyring.
2. **OpenAI API key** — paste a key; stored in the OS keyring, never on disk in
   plaintext, never exposed to the WebView.

Pick either in the onboarding screen. You can switch/add methods later under
**Settings → Account**.

---

## Quality gates (run before every PR)

```bash
# Frontend
npm run typecheck
npm run lint
npm run format:check
npm test                 # unit (vitest)
npm run test:e2e         # tauri-driver / WebDriver

# Rust
cargo fmt   --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo test  --manifest-path src-tauri/Cargo.toml
```

CI runs all of the above plus a bundle smoke test — see
[`docs/08-ci-cd.md`](docs/08-ci-cd.md).

---

## Build (production)

```bash
npm run tauri build
```

Artifacts are written to `src-tauri/target/release/bundle/`:

- `.deb`   (Debian/Ubuntu)
- `.rpm`   (Fedora/openSUSE)
- `.AppImage` (portable)

Arch packaging (`.pkg.tar.zst`) is produced via the `PKGBUILD` documented in
`docs/08-ci-cd.md`.

---

## Project layout

See [`docs/03-project-structure.md`](docs/03-project-structure.md) for the full
tree. Top level:

```
docs/        spec-driven documentation (read first)
src-tauri/   Rust core (commands, providers, store, mcp, agents)
src/         React + TypeScript frontend (feature-sliced)
tests/       e2e + fixtures
```

---

## Documentation map

| Doc | Purpose |
|-----|---------|
| [CLAUDE.md](CLAUDE.md) | AI context + architecture rules |
| [docs/00-vision-scope.md](docs/00-vision-scope.md) | Goals, non-goals, perf targets |
| [docs/01-architecture.md](docs/01-architecture.md) | System architecture |
| [docs/02-tech-stack.md](docs/02-tech-stack.md) | Stack rationale |
| [docs/03-project-structure.md](docs/03-project-structure.md) | Code layout & conventions |
| [docs/04-data-model.md](docs/04-data-model.md) | SQLite schema & entities |
| [docs/05-ipc-contract.md](docs/05-ipc-contract.md) | Tauri command surface |
| [docs/06-security-guardrails.md](docs/06-security-guardrails.md) | Security model |
| [docs/07-testing-strategy.md](docs/07-testing-strategy.md) | Test approach |
| [docs/08-ci-cd.md](docs/08-ci-cd.md) | Pipelines & packaging |
| [docs/09-implementation-roadmap.md](docs/09-implementation-roadmap.md) | Phased plan |
| [docs/10-ui-ux-layout.md](docs/10-ui-ux-layout.md) | UI parity reference |
| [docs/11-agent-automation-guide.md](docs/11-agent-automation-guide.md) | Multi-agent build: model routing & parallelization |
| [docs/agent-plan/](docs/agent-plan/) | Per-phase agent task lists (prompts, models, lanes) |
| [docs/specs/](docs/specs/) | Per-feature specs |
| [docs/adr/](docs/adr/) | Decision records |

---

## Contributing

1. Read the relevant spec in `docs/specs/`.
2. Implement behind the existing IPC/data-model contracts (update docs if they change).
3. Add the tests the spec requires.
4. Ensure all quality gates pass.
5. Open a PR — one feature slice where possible.
