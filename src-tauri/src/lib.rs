// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

// Module declarations for the project structure scaffold (per docs/03-project-structure.md).
// These will be expanded with feature modules (commands register handlers, core holds logic).
mod commands;
mod core;
mod harness;
mod mcp;
mod providers;
mod store;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
