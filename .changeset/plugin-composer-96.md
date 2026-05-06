---
'@agentskit/os-core': patch
---

#96: add `composePluginSurfaces` + `planPluginMount` — pure helpers that group a plugin's resolved contributions by surface (UI / triggers / dashboards / tools / observability / skills / memory) and produce a per-entry mount plan with skip reasons. Builds on #83 PluginConfig + `resolvePluginEntries`.
