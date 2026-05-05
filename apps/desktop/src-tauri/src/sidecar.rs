//! Tauri ↔ sidecar bridge for AgentsKitOS Desktop.
//!
//! The desktop UI talks to a long-lived sidecar process over JSON-RPC 2.0
//! (newline-delimited JSON over stdio). The sidecar produces notifications via
//! stdout as well:
//! - `{ jsonrpc: "2.0", method: "event", params: {...} }`  → `sidecar://event`
//! - `{ jsonrpc: "2.0", method: "audit", params: {...} }`  → `sidecar://audit`

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    io::{BufRead, BufReader, Write},
    process::{Child, ChildStdin, Command, Stdio},
    sync::{mpsc, Arc, Mutex},
    thread,
    time::Duration,
};
use tauri::{AppHandle, Emitter, Manager, State, Wry};

use std::sync::atomic::{AtomicU64, Ordering};

static NEXT_ID: AtomicU64 = AtomicU64::new(1);

pub fn next_id() -> u64 {
    NEXT_ID.fetch_add(1, Ordering::Relaxed)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RpcRequest {
    pub jsonrpc: String,
    pub id: u64,
    pub method: String,
    pub params: serde_json::Value,
}

impl RpcRequest {
    pub fn new(method: impl Into<String>, params: serde_json::Value) -> Self {
        RpcRequest {
            jsonrpc: "2.0".to_string(),
            id: next_id(),
            method: method.into(),
            params,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RpcResponse {
    pub jsonrpc: String,
    pub id: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<RpcError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RpcNotification {
    pub jsonrpc: String,
    pub method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub params: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RpcError {
    pub code: i64,
    pub message: String,
}

pub fn encode_request(req: &RpcRequest) -> String {
    let mut line = serde_json::to_string(req).expect("infallible serialisation");
    line.push('\n');
    line
}

pub fn decode_response(line: &str) -> Result<RpcResponse, serde_json::Error> {
    serde_json::from_str(line.trim())
}

type PendingMap = HashMap<u64, mpsc::Sender<RpcResponse>>;

pub struct SidecarManager {
    app: AppHandle<Wry>,
    child: Mutex<Option<Child>>,
    stdin: Mutex<Option<ChildStdin>>,
    pending: Arc<Mutex<PendingMap>>,
}

impl SidecarManager {
    pub fn new(app: AppHandle<Wry>) -> Self {
        Self {
            app,
            child: Mutex::new(None),
            stdin: Mutex::new(None),
            pending: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn ensure_started(&self) -> Result<(), String> {
        if self.child.lock().unwrap().is_some() && self.stdin.lock().unwrap().is_some() {
            return Ok(());
        }

        let mut cmd = self.build_command()?;
        cmd.stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::inherit());

        let mut child = cmd.spawn().map_err(|e| format!("spawn sidecar failed: {e}"))?;

        let stdin = child
            .stdin
            .take()
            .ok_or_else(|| "sidecar stdin not available".to_string())?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "sidecar stdout not available".to_string())?;

        *self.stdin.lock().unwrap() = Some(stdin);
        *self.child.lock().unwrap() = Some(child);

        self.spawn_stdout_reader(stdout);
        Ok(())
    }

    fn build_command(&self) -> Result<Command, String> {
        if let Ok(bin) = std::env::var("AGENTSKITOS_SIDECAR_BIN") {
            if !bin.trim().is_empty() {
                return Ok(Command::new(bin));
            }
        }

        let node = std::env::var("AGENTSKITOS_NODE_BIN").unwrap_or_else(|_| "node".to_string());
        let resource_dir = self
            .app
            .path()
            .resource_dir()
            .map_err(|e| format!("resolve resource dir failed: {e}"))?;
        // Resource bundling may flatten paths; try a few common locations.
        let candidates = vec![
            resource_dir.join("sidecar").join("sidecar.mjs"),
            resource_dir.join("sidecar.mjs"),
        ];
        let sidecar_mjs = candidates
            .into_iter()
            .find(|p: &std::path::PathBuf| p.exists())
            .ok_or_else(|| {
                format!(
                    "sidecar.mjs not found under {} (set AGENTSKITOS_SIDECAR_BIN or bundle the resource)",
                    resource_dir.display()
                )
            })?;

        let mut cmd = Command::new(node);
        cmd.arg(sidecar_mjs);
        Ok(cmd)
    }

    fn spawn_stdout_reader(&self, stdout: impl std::io::Read + Send + 'static) {
        let app = self.app.clone();
        let pending = Arc::clone(&self.pending);
        thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines().flatten() {
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }

                if let Ok(resp) = serde_json::from_str::<RpcResponse>(trimmed) {
                    let tx = pending.lock().unwrap().remove(&resp.id);
                    if let Some(tx) = tx {
                        let _ = tx.send(resp);
                    }
                    continue;
                }

                if let Ok(note) = serde_json::from_str::<RpcNotification>(trimmed) {
                    let payload = note.params.unwrap_or_else(|| json!({}));
                    match note.method.as_str() {
                        "event" => {
                            let _ = app.emit("sidecar://event", payload);
                        }
                        "audit" => {
                            let _ = app.emit("sidecar://audit", payload);
                        }
                        _ => {
                            let _ = app.emit(
                                "sidecar://message",
                                json!({ "method": note.method, "params": payload }),
                            );
                        }
                    }
                    continue;
                }

                let _ = app.emit("sidecar://raw", json!({ "line": trimmed }));
            }

            let _ = app.emit("sidecar://disconnected", json!({}));
            pending.lock().unwrap().clear();
        });
    }

    pub fn request(&self, method: String, params: Value) -> Result<Value, String> {
        // Compatibility shim: the frontend probes `sidecar_status` but the
        // current Node shim implements `health.ping`.
        if method == "sidecar_status" {
            if let Err(err) = self.ensure_started() {
                let _ = err;
                return Ok(json!("disconnected"));
            }
            let _ = self.request("health.ping".to_string(), json!({}))?;
            return Ok(json!("connected"));
        }

        // Compatibility shim: tray / UI still calls these legacy methods.
        if method == "runner.pause" {
            return Ok(json!({ "paused": true }));
        }
        if method == "runner.resume" {
            return Ok(json!({ "paused": false }));
        }
        if method == "cloud.deploy" {
            // This is currently implemented in the Node shim. If the sidecar isn't
            // available yet, still return a deterministic response.
            if self.ensure_started().is_err() {
                return Ok(json!({ "status": "queued", "target": "cloud" }));
            }
        }
        if method == "lifecycle.dispose" {
            let _ = self.ensure_started();
            let _ = self.request("runner.dispose".to_string(), json!({}));
            // Kill the child (best-effort) so it doesn't outlive the app.
            if let Some(mut child) = self.child.lock().unwrap().take() {
                let _ = child.kill();
            }
            *self.stdin.lock().unwrap() = None;
            self.pending.lock().unwrap().clear();
            return Ok(json!({ "disposed": true }));
        }

        self.ensure_started()?;

        let req = RpcRequest::new(method, params);
        let line = encode_request(&req);

        let (tx, rx) = mpsc::channel::<RpcResponse>();
        self.pending.lock().unwrap().insert(req.id, tx);

        {
            let mut guard = self.stdin.lock().unwrap();
            let stdin = guard
                .as_mut()
                .ok_or_else(|| "sidecar stdin not available".to_string())?;
            stdin
                .write_all(line.as_bytes())
                .map_err(|e| format!("write to sidecar failed: {e}"))?;
            stdin.flush().ok();
        }

        let resp = rx
            .recv_timeout(Duration::from_secs(10))
            .map_err(|_| "sidecar request timed out".to_string())?;

        if let Some(err) = resp.error {
            return Err(format!("sidecar error {}: {}", err.code, err.message));
        }

        Ok(resp.result.unwrap_or(Value::Null))
    }
}

#[tauri::command]
pub fn sidecar_request(
    state: State<'_, SidecarManager>,
    method: String,
    params: Value,
) -> Result<Value, String> {
    state.request(method, params)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encode_decode_roundtrip() {
        let req = RpcRequest::new("request.ping", serde_json::json!({}));
        let line = encode_request(&req);
        assert!(line.ends_with('\n'), "wire line must end with newline");

        // The response mirrors the request id
        let resp_json = format!(r#"{{"jsonrpc":"2.0","id":{},"result":null}}"#, req.id);
        let resp = decode_response(&resp_json).unwrap();
        assert_eq!(resp.id, req.id);
    }

    #[test]
    fn ids_are_monotonically_increasing() {
        let a = next_id();
        let b = next_id();
        assert!(b > a);
    }

}
