---
"@agentskit/desktop": patch
"@agentskit/os-desktop": patch
"@agentskit/web": patch
---

Refactor: M2 scope cut + packages/os-desktop split. Per ADR-0018 §3.5,
the React app moves to a bundled-private `@agentskit/os-desktop`
package; `apps/desktop` keeps the Tauri shell and Vite entry only.
M3-M9 surfaces (flows/triggers/hitl/evals/benchmark/cost/security plus
voice/assistant/fork/artifacts/multi-monitor/theme-editor/snapshot/
plugins/example-library) are staged in `_wip/` until their backend
contracts ship. App.tsx split 1096 -> 127 lines into providers, shell,
wirers, and nav modules. Web consumes `@agentskit/os-ui` tokens.css
per ADR-0018 §3.7; dead `apps/web/components/ui/button.tsx` removed.
Sidecar requires `os-headless` (no graceful-degrade fallback).
