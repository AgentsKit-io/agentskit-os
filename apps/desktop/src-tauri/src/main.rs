// Prevents additional console window on Windows in release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Arc;

use anyhow::Context;
use serde_json::Value;
use tauri::{AppHandle, Manager, Runtime, State};
use tokio::process::Command;

mod sidecar;
use sidecar::{PendingMap, SidecarClient};

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

struct SidecarState(Arc<SidecarClient>);

// ---------------------------------------------------------------------------
// Tauri commands
// ---------------------------------------------------------------------------

/// Send a JSON-RPC request to the sidecar and return the result.
#[tauri::command]
async fn sidecar_request(
    method: String,
    params: Value,
    state: State<'_, SidecarState>,
) -> Result<Value, String> {
    state
        .0
        .request(&method, params)
        .await
        .map_err(|e| e.to_string())
}

/// Confirms the sidecar event channel is wired.
/// The reader loop in sidecar.rs forwards events to the front-end automatically
/// via `app.emit("sidecar://event", ...)`.
#[tauri::command]
async fn sidecar_subscribe() -> Result<(), String> {
    Ok(())
}

// ---------------------------------------------------------------------------
// Sidecar spawn helpers
// ---------------------------------------------------------------------------

struct SpawnedSidecar {
    client: SidecarClient,
    pending: PendingMap,
    stdout: tokio::process::ChildStdout,
}

fn spawn_sidecar<R: Runtime>(app: &AppHandle<R>) -> anyhow::Result<SpawnedSidecar> {
    let is_debug = cfg!(debug_assertions);

    let mut cmd = if is_debug {
        // Dev mode: run the JS sidecar shim directly with Node.
        // The shim lives at apps/desktop/sidecar/sidecar.mjs relative to the
        // Tauri process working directory when launched via `tauri dev`.
        let mut c = Command::new("node");
        c.arg("sidecar/sidecar.mjs");
        c
    } else {
        // Production: Node.js compiled to a single executable (SEA) bundled as
        // an external binary. Path provided by Tauri resource resolution.
        let sidecar_path = app
            .path()
            .resource_dir()
            .context("resource dir not available")?
            .join("agentskit-sidecar");

        Command::new(sidecar_path)
    };

    cmd.stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::inherit());

    let mut child = cmd.spawn().context("spawn sidecar process")?;

    let stdin = child.stdin.take().context("sidecar stdin handle")?;
    let stdout = child.stdout.take().context("sidecar stdout handle")?;

    // Let Tokio manage the child lifetime.
    tokio::spawn(async move {
        let _ = child.wait().await;
    });

    let client = SidecarClient::new(stdin);
    let pending = client.pending.clone();

    Ok(SpawnedSidecar {
        client,
        pending,
        stdout,
    })
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let handle = app.handle().clone();

            match spawn_sidecar(&handle) {
                Ok(spawned) => {
                    SidecarClient::spawn_reader(spawned.stdout, spawned.pending, handle);
                    app.manage(SidecarState(Arc::new(spawned.client)));
                }
                Err(e) => {
                    // Non-fatal in dev: log and continue so UI can show an error state.
                    eprintln!("[desktop] failed to spawn sidecar: {e}");
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![sidecar_request, sidecar_subscribe])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
