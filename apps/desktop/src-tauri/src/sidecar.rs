// sidecar.rs — JSON-RPC client over the spawned os-headless Node process stdio.
//
// Manages:
//   - id-correlated request/response pairing
//   - broadcast event forwarding to the Tauri front-end via `app.emit`
//   - one writer task + one reader task over the child process stdio

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    collections::HashMap,
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc,
    },
};
use tokio::{
    io::{AsyncBufReadExt, AsyncWriteExt, BufReader},
    process::{ChildStdin, ChildStdout},
    sync::{oneshot, Mutex},
};

// ---------------------------------------------------------------------------
// Wire types
// ---------------------------------------------------------------------------

#[derive(Serialize)]
struct JsonRpcRequest<'a> {
    jsonrpc: &'static str,
    id: u64,
    method: &'a str,
    params: Value,
}

#[derive(Deserialize, Debug)]
#[serde(untagged)]
enum WireMessage {
    Response(JsonRpcResponse),
    Notification(JsonRpcNotification),
}

#[derive(Deserialize, Debug)]
struct JsonRpcResponse {
    #[allow(dead_code)]
    jsonrpc: String,
    id: u64,
    #[serde(flatten)]
    outcome: RpcOutcome,
}

#[derive(Deserialize, Debug)]
#[serde(untagged)]
enum RpcOutcome {
    Ok { result: Value },
    Err { error: RpcError },
}

#[derive(Deserialize, Debug)]
struct RpcError {
    message: String,
}

#[derive(Deserialize, Debug)]
struct JsonRpcNotification {
    #[allow(dead_code)]
    jsonrpc: String,
    method: String,
    params: Value,
}

// ---------------------------------------------------------------------------
// Client handle
// ---------------------------------------------------------------------------

pub type PendingMap = Arc<Mutex<HashMap<u64, oneshot::Sender<Result<Value>>>>>;

pub struct SidecarClient {
    stdin: Arc<Mutex<ChildStdin>>,
    counter: Arc<AtomicU64>,
    pending: PendingMap,
}

impl SidecarClient {
    pub fn new(stdin: ChildStdin) -> Self {
        Self {
            stdin: Arc::new(Mutex::new(stdin)),
            counter: Arc::new(AtomicU64::new(1)),
            pending: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Spawn the reader loop that drives response/event routing.
    ///
    /// `app_handle` is used to emit `sidecar://event` events to the front-end.
    pub fn spawn_reader<R: tauri::Runtime>(
        stdout: ChildStdout,
        pending: PendingMap,
        app_handle: tauri::AppHandle<R>,
    ) {
        tokio::spawn(async move {
            let mut lines = BufReader::new(stdout).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let line = line.trim().to_owned();
                if line.is_empty() {
                    continue;
                }
                match serde_json::from_str::<WireMessage>(&line) {
                    Ok(WireMessage::Response(resp)) => {
                        let mut map = pending.lock().await;
                        if let Some(tx) = map.remove(&resp.id) {
                            let result = match resp.outcome {
                                RpcOutcome::Ok { result } => Ok(result),
                                RpcOutcome::Err { error } => {
                                    Err(anyhow::anyhow!(error.message))
                                }
                            };
                            let _ = tx.send(result);
                        }
                    }
                    Ok(WireMessage::Notification(notif)) => {
                        // Forward sidecar notification as a Tauri event.
                        let _ = app_handle.emit(
                            "sidecar://event",
                            serde_json::json!({
                                "method": notif.method,
                                "params": notif.params,
                            }),
                        );
                    }
                    Err(e) => {
                        eprintln!("[sidecar] parse error: {e} — line: {line}");
                    }
                }
            }
        });
    }

    /// Send a JSON-RPC request and await the correlated response.
    pub async fn request(&self, method: &str, params: Value) -> Result<Value> {
        let id = self.counter.fetch_add(1, Ordering::SeqCst);
        let (tx, rx) = oneshot::channel();

        {
            let mut map = self.pending.lock().await;
            map.insert(id, tx);
        }

        let msg = serde_json::to_string(&JsonRpcRequest {
            jsonrpc: "2.0",
            id,
            method,
            params,
        })
        .context("serialise JSON-RPC request")?;

        {
            let mut stdin = self.stdin.lock().await;
            stdin
                .write_all(format!("{msg}\n").as_bytes())
                .await
                .context("write to sidecar stdin")?;
            stdin.flush().await.context("flush sidecar stdin")?;
        }

        rx.await
            .context("sidecar reader dropped before response")?
    }
}
