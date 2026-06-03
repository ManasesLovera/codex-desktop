
export default function App() {
  return (
    <div className="flex h-screen flex-col bg-[var(--cdx-color-bg)] text-[var(--cdx-color-fg)]">
      {/* Titlebar (placeholder) */}
      <div className="h-9 border-b border-[var(--cdx-color-border)] bg-[var(--cdx-color-bg-elevated)] flex items-center px-[var(--cdx-spacing-4)] text-xs select-none">
        Codex Desktop
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-60 border-r border-[var(--cdx-color-border)] bg-[var(--cdx-color-bg-subtle)] p-[var(--cdx-spacing-3)] text-sm">
          <div className="mb-2 font-medium text-[var(--cdx-color-fg-muted)]">Projects</div>
          <div className="rounded-[var(--cdx-radius-sm)] bg-[var(--cdx-color-bg)] p-2 text-[var(--cdx-color-fg-muted)]">
            (projects list placeholder)
          </div>
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col">
          <div className="border-b border-[var(--cdx-color-border)] p-[var(--cdx-spacing-3)] text-sm">
            Main workspace area — Phase 0 scaffold
          </div>
          <div className="flex-1 p-[var(--cdx-spacing-4)]">
            <p className="text-[var(--cdx-color-fg-muted)]">
              Directory structure per docs/03-project-structure.md complete.
              <br />
              Tailwind + tokens wired. Ready for features.
            </p>
            <div className="mt-4 rounded-[var(--cdx-radius-md)] border border-[var(--cdx-color-border)] bg-[var(--cdx-color-bg-elevated)] p-4 text-xs font-mono">
              src/app/ • src/features/ • src/components/ • src/lib/ • src/styles/
            </div>
          </div>
        </div>

        {/* Right side panel dock (placeholder) */}
        <div className="w-80 border-l border-[var(--cdx-color-border)] bg-[var(--cdx-color-bg-elevated)] p-[var(--cdx-spacing-3)] text-sm">
          <div className="text-[var(--cdx-color-fg-muted)]">Side panel</div>
          <div className="mt-2 text-[10px] opacity-60">(browser / chat / terminal / review)</div>
        </div>
      </div>

      {/* Status bar */}
      <div className="h-6 border-t border-[var(--cdx-color-border)] bg-[var(--cdx-color-bg-subtle)] px-[var(--cdx-spacing-3)] text-[10px] flex items-center text-[var(--cdx-color-fg-muted)]">
        Ready • Rust core + React renderer (Tauri 2)
      </div>
    </div>
  );
}
