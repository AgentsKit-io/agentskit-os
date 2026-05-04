// Prevents an additional console window on Windows in release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod sidecar;
mod tray;
mod windows;

use tauri::{Emitter, Manager, WindowEvent};

fn main() {
    let no_tray = std::env::var("AGENTSKITOS_NO_TRAY")
        .map(|v| v == "1")
        .unwrap_or(false);

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(move |app| {
            // Register the system tray unless opted out.
            if !no_tray {
                let _tray = tray::build_tray(app.handle())
                    .expect("failed to build system tray");
                // Store the tray handle so it lives for the app lifetime.
                app.manage(_tray);
            }
            Ok(())
        })
        .on_window_event(move |window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if !no_tray {
                    // Service mode: hide instead of close so the sidecar keeps
                    // running.  The user can re-open via the tray.
                    api.prevent_close();
                    let _ = window.hide();

                    // Notify the front-end that the window was hidden so the
                    // "Service mode active" banner can be shown on next open.
                    let _ = window.emit("tray://window-hidden", ());
                }
                // When --no-tray / AGENTSKITOS_NO_TRAY=1: let the default
                // close behaviour proceed (app exits normally).
            }
        })
        .invoke_handler(tauri::generate_handler![
            windows::list_monitors,
            windows::open_window,
            windows::close_window,
            windows::save_window_layout,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
