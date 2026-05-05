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
use serde_json::{json, Value};
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

/// Tauri command used by the React shell.
///
/// This is intentionally an in-process bridge for the first usable desktop
/// build. The JSON-RPC envelope helpers above remain the contract for the
/// bundled Node sidecar process; until that process manager is wired, this
/// command gives the desktop app deterministic responses instead of failing
/// every invoke with "unknown command".
#[tauri::command]
pub fn sidecar_request(method: String, params: Value) -> Result<Value, String> {
    handle_request(&method, params)
}

pub fn handle_request(method: &str, params: Value) -> Result<Value, String> {
    match method {
        "sidecar_status" => Ok(json!("connected")),
        "runner.pause" => Ok(json!({ "paused": true })),
        "runner.resume" => Ok(json!({ "paused": false })),
        "lifecycle.dispose" => Ok(json!({ "disposed": true })),
        "dashboard.stats" => Ok(json!({
            "totalRuns24h": 77,
            "liveCostUsd": 12.34,
            "avgLatencyMs": 940000,
            "errorRatePct": 3.1
        })),
        "workspaces.list" => Ok(json!([
            { "id": "ws-default", "name": "Default", "status": "running" },
            { "id": "ws-staging", "name": "Staging", "status": "paused" },
            { "id": "ws-production", "name": "Production", "status": "idle" }
        ])),
        "runs.list" => Ok(runs()),
        "flows.list" => Ok(flows()),
        "agents.list" => Ok(agents()),
        "triggers.list" => Ok(triggers()),
        "evals.list" => Ok(evals()),
        "benchmarks.list" => Ok(benchmarks()),
        "security.controls" => Ok(security_controls()),
        "cost.budgets" => Ok(cost_budgets()),
        "hitl.list" => Ok(hitl_requests()),
        "traces.list" => Ok(traces()),
        "traces.get" => Ok(trace_spans(
            params
                .get("traceId")
                .and_then(Value::as_str)
                .unwrap_or("trace-run-dev-001"),
        )),
        "search.findSimilar" => Ok(json!({ "ok": true })),
        "templates.scaffoldFrom" => Ok(json!({
            "status": "queued",
            "runId": "run-template-scaffold"
        })),
        "flows.create" => Ok(json!({
            "ok": true,
            "id": "flow-draft-local"
        })),
        "traces.replay" => Ok(json!({
            "status": "queued",
            "runId": "run-replay-local"
        })),
        "plugins.contributions" => Ok(json!({
            "commands": [],
            "navigation": [],
            "widgets": []
        })),
        "plugins.widget.render" => Ok(json!({
            "type": "empty",
            "title": "Widget unavailable",
            "description": "Plugin widgets will render after the sidecar plugin host is connected."
        })),
        "voice.handle" => Ok(json!({ "ok": true })),
        method => Err(format!("sidecar method not implemented: {method}")),
    }
}

fn runs() -> Value {
    json!([
        {
            "id": "run-dev-001",
            "task": "Implement driver.js onboarding tour",
            "repository": "AgentsKit-io/agentskit-os",
            "branch": "codex/desktop-ia-onboarding-driver",
            "trigger": "manual",
            "status": "succeeded",
            "startedAt": "2026-05-04T18:42:00.000Z",
            "updatedAt": "2026-05-04T19:13:00.000Z",
            "durationMs": 1860000,
            "costUsd": 2.84,
            "inputTokens": 128400,
            "outputTokens": 19240,
            "agents": [
                { "id": "codex-ui", "label": "Codex UI worker", "provider": "codex", "status": "succeeded" },
                { "id": "claude-review", "label": "Claude review pass", "provider": "claude", "status": "succeeded" }
            ]
        },
        {
            "id": "run-dev-002",
            "task": "Compare providers for flow editor scaffold",
            "repository": "AgentsKit-io/agentskit-os",
            "branch": "feat/os-flow-live-debugger",
            "trigger": "github_pr",
            "status": "running",
            "startedAt": "2026-05-04T19:08:00.000Z",
            "updatedAt": "2026-05-04T19:15:00.000Z",
            "durationMs": 420000,
            "costUsd": 1.16,
            "inputTokens": 74900,
            "outputTokens": 8120,
            "agents": [
                { "id": "codex-orchestrator", "label": "Codex orchestrator", "provider": "codex", "status": "running" },
                { "id": "gemini-planner", "label": "Gemini planner", "provider": "gemini", "status": "succeeded" },
                { "id": "claude-impl", "label": "Claude implementation", "provider": "claude", "status": "running" }
            ]
        }
    ])
}

fn flows() -> Value {
    json!([
        {
            "id": "flow-dev-orchestrator",
            "name": "Development orchestrator",
            "status": "active",
            "trigger": "pull_request",
            "version": "v0.8.2",
            "owner": "Platform Engineering",
            "runs24h": 42,
            "successRatePct": 93,
            "avgDurationMs": 1180000,
            "lastRunAt": "2026-05-04T19:45:00.000Z",
            "nodes": ["triage", "plan", "fanout", "verify", "report"],
            "edges": ["triage -> plan", "plan -> fanout", "fanout -> verify", "verify -> report"],
            "notes": ["Delegates Codex, Claude, and Gemini workers", "Requires HITL when projected cost exceeds budget"]
        },
        {
            "id": "flow-clinic-triage",
            "name": "Clinic request triage",
            "status": "active",
            "trigger": "webhook",
            "version": "v0.4.1",
            "owner": "Healthcare Ops",
            "runs24h": 18,
            "successRatePct": 97,
            "avgDurationMs": 420000,
            "lastRunAt": "2026-05-04T19:18:00.000Z",
            "nodes": ["ingest", "redact", "route", "summarize", "handoff"],
            "edges": ["ingest -> redact", "redact -> route", "route -> summarize", "summarize -> handoff"],
            "notes": ["PHI redaction enabled before model calls", "EU routing still needs provider lock review"]
        },
        {
            "id": "flow-nightly-benchmark",
            "name": "Nightly model benchmark",
            "status": "paused",
            "trigger": "cron",
            "version": "v0.5.3",
            "owner": "Quality",
            "runs24h": 1,
            "successRatePct": 88,
            "avgDurationMs": 2640000,
            "lastRunAt": "2026-05-04T03:00:00.000Z",
            "nodes": ["select_tasks", "launch_agents", "score", "compare", "notify"],
            "edges": ["select_tasks -> launch_agents", "launch_agents -> score", "score -> compare", "compare -> notify"],
            "notes": ["Paused by cost guard after Anthropic budget warning", "Can resume with manual override"]
        }
    ])
}

fn agents() -> Value {
    json!([
        { "id": "agent-codex-dev", "name": "Codex Development Orchestrator", "provider": "codex", "status": "ready", "model": "gpt-5.5", "cliCommand": "codex", "version": "0.63.0", "capabilities": ["code-edit", "tests", "git", "browser-ui"], "activeRuns": 1, "successRatePct": 94, "avgCostUsd": 1.42, "lastRunAt": "2026-05-04T19:16:00.000Z" },
        { "id": "agent-claude-impl", "name": "Claude Implementation Worker", "provider": "claude", "status": "busy", "model": "claude-sonnet-4.6", "cliCommand": "claude", "version": "2.0.14", "capabilities": ["code-edit", "architecture", "docs"], "activeRuns": 2, "successRatePct": 91, "avgCostUsd": 1.86, "lastRunAt": "2026-05-04T19:12:00.000Z" },
        { "id": "agent-cursor-review", "name": "Cursor Review Assistant", "provider": "cursor", "status": "needs_auth", "model": "cursor-agent", "cliCommand": "cursor-agent", "version": "not linked", "capabilities": ["repo-context", "review", "refactor"], "activeRuns": 0, "successRatePct": 87, "avgCostUsd": 0.94, "lastRunAt": "2026-05-04T17:40:00.000Z" },
        { "id": "agent-gemini-planner", "name": "Gemini Planning Scout", "provider": "gemini", "status": "ready", "model": "gemini-2.5-pro", "cliCommand": "gemini", "version": "1.8.2", "capabilities": ["planning", "large-context", "benchmark"], "activeRuns": 0, "successRatePct": 89, "avgCostUsd": 0.78, "lastRunAt": "2026-05-04T18:58:00.000Z" }
    ])
}

fn triggers() -> Value {
    json!([
        { "id": "trigger-slack-prd", "name": "Slack product request intake", "provider": "slack", "status": "active", "targetFlow": "dev-orchestrator.prd-to-issues", "agentPolicy": "Codex primary, Claude reviewer", "lastFiredAt": "2026-05-04T19:18:00.000Z", "runs24h": 9, "successRatePct": 96, "cost24hUsd": 4.18, "configSummary": "#product-requests, mentions + thread replies" },
        { "id": "trigger-github-pr", "name": "GitHub PR implementation review", "provider": "github_pr", "status": "active", "targetFlow": "dev-orchestrator.pr-review", "agentPolicy": "Claude review, Codex patch planner", "lastFiredAt": "2026-05-04T19:11:00.000Z", "runs24h": 14, "successRatePct": 91, "cost24hUsd": 6.72, "configSummary": "AgentsKit-io/agentskit-os, opened + synchronize" },
        { "id": "trigger-nightly-benchmark", "name": "Nightly model benchmark", "provider": "cron", "status": "paused", "targetFlow": "quality.model-benchmark", "agentPolicy": "Codex, Claude, Gemini parallel", "lastFiredAt": "2026-05-03T03:00:00.000Z", "runs24h": 0, "successRatePct": 88, "cost24hUsd": 0, "configSummary": "0 3 * * *, America/Sao_Paulo" }
    ])
}

fn evals() -> Value {
    json!([
        { "id": "eval-pr-review-quality", "name": "PR review quality gate", "status": "passing", "cadence": "on_pr", "dataset": "desktop-pr-review-fixtures", "scorer": "rubric.completeness-v2", "targetFlow": "dev-orchestrator.pr-review", "cases": 48, "passRatePct": 96, "regressionCount": 0, "avgCostUsd": 0.42, "lastRunAt": "2026-05-04T19:22:00.000Z", "notes": ["Catches missing tests", "Scores severity accuracy"] },
        { "id": "eval-trigger-routing", "name": "Trigger routing contracts", "status": "regressed", "cadence": "nightly", "dataset": "trigger-provider-contracts", "scorer": "schema.route-match", "targetFlow": "triggers.dispatch", "cases": 62, "passRatePct": 87, "regressionCount": 3, "avgCostUsd": 0.28, "lastRunAt": "2026-05-04T03:00:00.000Z", "notes": ["Webhook payload mismatch", "Teams auth refresh edge case"] }
    ])
}

fn benchmarks() -> Value {
    json!([
        { "id": "bench-onboarding-codex", "task": "Implement desktop onboarding tour", "provider": "codex", "model": "gpt-5.5", "status": "complete", "completenessPct": 96, "testsPassedPct": 100, "durationMs": 1420000, "costUsd": 2.84, "tokens": 147640, "completedAt": "2026-05-04T19:13:00.000Z", "summary": "Delivered production code, tests, lockfile update, and PR workflow with minimal follow-up.", "strengths": ["Best end-to-end completion", "Strong test coverage"], "gaps": ["Bundle size increased after new UI surfaces"] },
        { "id": "bench-onboarding-claude", "task": "Implement desktop onboarding tour", "provider": "claude", "model": "claude-sonnet-4.6", "status": "complete", "completenessPct": 89, "testsPassedPct": 94, "durationMs": 1760000, "costUsd": 3.12, "tokens": 162880, "completedAt": "2026-05-04T19:08:00.000Z", "summary": "Produced clean architecture notes and implementation plan, but needed integration fixes.", "strengths": ["Strong design critique"], "gaps": ["Missed runtime fallback behavior"] }
    ])
}

fn security_controls() -> Value {
    json!([
        { "id": "sec-audit-chain", "name": "Hash-chained audit log", "area": "audit", "status": "healthy", "owner": "Platform Security", "lastCheckedAt": "2026-05-04T19:41:00.000Z", "evidence": "audit.chain.verify", "coveragePct": 98, "findings": 0, "notes": ["Run, tool, HITL, and cost events have signed evidence"] },
        { "id": "sec-privacy-routing", "name": "Regional privacy routing", "area": "privacy", "status": "blocked", "owner": "Compliance", "lastCheckedAt": "2026-05-04T17:30:00.000Z", "evidence": "privacy.region.route", "coveragePct": 61, "findings": 4, "notes": ["EU clinic template missing provider region lock"] }
    ])
}

fn cost_budgets() -> Value {
    json!([
        { "id": "budget-openai-dev", "name": "OpenAI development tasks", "provider": "openai", "status": "healthy", "spendUsd": 84.2, "limitUsd": 250, "tokens": 4820000, "runs": 148, "resetAt": "2026-06-01T00:00:00.000Z", "owner": "Platform Engineering", "policy": "Allow normal runs, require HITL above $12 per task.", "quotaNotes": ["gpt-5.5 default for Codex", "hard cap at 90% monthly spend"] },
        { "id": "budget-anthropic-review", "name": "Anthropic review workers", "provider": "anthropic", "status": "watch", "spendUsd": 196.7, "limitUsd": 225, "tokens": 3940000, "runs": 96, "resetAt": "2026-06-01T00:00:00.000Z", "owner": "Code Review", "policy": "Pause new review fan-out at 85%, allow single reviewer runs.", "quotaNotes": ["Claude implementation workers near cap"] }
    ])
}

fn hitl_requests() -> Value {
    json!([
        { "id": "hitl-approval-002", "title": "Allow benchmark run over budget", "kind": "cost_exception", "status": "pending", "risk": "high", "requester": "Gemini Planning Scout", "runId": "run-dev-002", "agent": "gemini", "createdAt": "2026-05-04T19:17:00.000Z", "expiresAt": "2026-05-04T20:17:00.000Z", "summary": "Parallel model benchmark needs to exceed the default task budget to compare Codex, Claude, and Gemini outputs.", "evidence": ["$12.00 projected cost", "3 providers selected"], "traceUrl": "#/traces/run-dev-002", "policyRuleIds": ["cost.per_flow"] },
        { "id": "hitl-approval-005", "title": "Clinical protocol deviation chart review", "kind": "clinical_review", "status": "pending", "risk": "high", "requester": "Clinical Safety Orchestrator", "runId": "run-clin-220", "agent": "claude", "createdAt": "2026-05-04T20:05:00.000Z", "expiresAt": "2026-05-04T21:30:00.000Z", "summary": "Automated triage flagged a dosage suggestion outside the approved protocol branch.", "evidence": ["protocol v3.2 matched", "HITL required by domain pack"], "traceUrl": "#/traces/run-clin-220", "policyRuleIds": ["domainPack.clinical.hitl"] }
    ])
}

fn traces() -> Value {
    json!([
        { "traceId": "trace-run-dev-001", "flowId": "flow-dev-orchestrator", "runMode": "real", "startedAt": "2026-05-04T18:42:00.000Z", "durationMs": 1860000, "status": "ok" },
        { "traceId": "trace-run-dev-002", "flowId": "flow-nightly-benchmark", "runMode": "preview", "startedAt": "2026-05-04T19:08:00.000Z", "durationMs": 420000, "status": "paused" }
    ])
}

fn trace_spans(trace_id: &str) -> Value {
    json!([
        {
            "traceId": trace_id,
            "spanId": format!("{trace_id}-span-flow"),
            "kind": "flow",
            "name": "flow.started",
            "workspaceId": "ws-default",
            "startedAt": "2026-05-04T18:42:00.000Z",
            "endedAt": "2026-05-04T19:13:00.000Z",
            "durationMs": 1860000,
            "status": "ok",
            "attributes": {
                "agentskitos.flow_id": "flow-dev-orchestrator",
                "agentskitos.run_mode": "real",
                "trace.source": "desktop-local-bridge"
            }
        },
        {
            "traceId": trace_id,
            "spanId": format!("{trace_id}-span-agent"),
            "parentSpanId": format!("{trace_id}-span-flow"),
            "kind": "agent",
            "name": "agent.delegate",
            "workspaceId": "ws-default",
            "startedAt": "2026-05-04T18:48:00.000Z",
            "endedAt": "2026-05-04T19:03:20.000Z",
            "durationMs": 920000,
            "status": "ok",
            "attributes": {
                "agent.provider": "codex",
                "agent.model": "gpt-5.5"
            }
        }
    ])
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

    #[test]
    fn command_status_returns_connected() {
        let result = handle_request("sidecar_status", serde_json::json!({})).unwrap();
        assert_eq!(result, serde_json::json!("connected"));
    }

    #[test]
    fn list_methods_return_arrays() {
        for method in [
            "runs.list",
            "flows.list",
            "agents.list",
            "triggers.list",
            "evals.list",
            "benchmarks.list",
            "security.controls",
            "cost.budgets",
            "hitl.list",
            "traces.list",
        ] {
            let result = handle_request(method, serde_json::json!({})).unwrap();
            assert!(
                result.as_array().is_some(),
                "{method} should return an array"
            );
        }
    }

    #[test]
    fn runner_commands_return_state_payloads() {
        assert_eq!(
            handle_request("runner.pause", serde_json::json!({})).unwrap(),
            serde_json::json!({ "paused": true })
        );
        assert_eq!(
            handle_request("runner.resume", serde_json::json!({})).unwrap(),
            serde_json::json!({ "paused": false })
        );
    }

    #[test]
    fn unknown_method_is_an_error() {
        let err = handle_request("unknown.method", serde_json::json!({})).unwrap_err();
        assert!(err.contains("unknown.method"));
    }
}
