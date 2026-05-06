/**
 * Public surface of @agentskit/os-desktop — the bundled-private React app
 * that the Tauri shell (apps/desktop) renders. Per ADR-0018 §3.5.
 *
 * Plugin authors targeting the desktop write against the IPC schema and
 * the `ui-panel` extension point (ADR-0012); they do not import App
 * internals directly.
 */
export { App } from './app'
