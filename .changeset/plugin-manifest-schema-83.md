---
'@agentskit/os-core': patch
---

#83: extend `PluginConfig` with optional `entryPoints` (per-contribution module paths), `uiSlot`, `isolation` (`iframe` / `webview` / `subprocess` / `none`), and `minHostVersion`. Adds `resolvePluginEntries` helper that returns one entry per declared contribution with caller-pinned or default isolation. Lays the schema foundation the loader (`packages/os-plugins`) will consume to gate UI-slot injection and subprocess isolation.
