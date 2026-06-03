// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// NOTE: Actual module declarations live in src/lib.rs (the tauri_app_lib crate root).
// The modules (commands, core, providers, store, mcp, harness) are declared there
// per the split-bin+lib layout used by this Tauri template. See docs/03-project-structure.md.

fn main() {
    tauri_app_lib::run()
}
