// Typed Tauri IPC wrapper.
// Wraps @tauri-apps/api/core invoke + listen with AppError handling and generated bindings.
// See docs/05-ipc-contract.md and ADR-0007.
// Implementation + first command (app_health) added in later Phase 0 step.

// import { invoke } from "@tauri-apps/api/core"; // uncomment when first command is wired

// Example typed helper (stub):
// export async function appHealth(): Promise<import("./bindings").AppHealth> {
//   return invoke("app_health");
// }

export const ipc = {
  // populated as commands are added
};
