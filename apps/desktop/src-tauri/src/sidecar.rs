// The public API surface is scaffolded but not yet wired to the Rust sidecar
// process manager.  Suppress dead_code warnings until that wiring lands.
#![allow(dead_code)]

/// Sidecar JSON-RPC 2.0 client over stdio.
///
/// The sidecar is the `@agentskit/os-headless` Node binary bundled as an
/// external binary in `tauri.conf.json > bundle > externalBin`.
///
/// IPC contract (ADR-0018 §3.2):
///   request  — front → sidecar (user-initiated actions)
///   event    — sidecar → front (observability stream)
///   audit    — sidecar → front (signed audit records)
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicU64, Ordering};

static NEXT_ID: AtomicU64 = AtomicU64::new(1);

/// Allocate the next monotonic JSON-RPC request id.
pub fn next_id() -> u64 {
    NEXT_ID.fetch_add(1, Ordering::Relaxed)
}

/// Minimal JSON-RPC 2.0 request envelope.
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

/// Minimal JSON-RPC 2.0 response envelope.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RpcResponse {
    pub jsonrpc: String,
    pub id: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<RpcError>,
}

/// JSON-RPC 2.0 error object.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RpcError {
    pub code: i64,
    pub message: String,
}

/// Serialise a request to the newline-delimited wire format expected by the
/// sidecar's stdio reader.
pub fn encode_request(req: &RpcRequest) -> String {
    let mut line = serde_json::to_string(req).expect("infallible serialisation");
    line.push('\n');
    line
}

/// Parse one line of sidecar stdout as a JSON-RPC response.
pub fn decode_response(line: &str) -> Result<RpcResponse, serde_json::Error> {
    serde_json::from_str(line.trim())
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
        let resp_json = format!(
            r#"{{"jsonrpc":"2.0","id":{},"result":null}}"#,
            req.id
        );
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
