---
"@agentskit/os-core": patch
"@agentskit/os-cli": patch
"@agentskit/os-flow": patch
---

Internal: ADR-0014 publish vs bundle policy. Three distribution tiers — `public` (npm published, plugin authors compile against), `bundled-private` (`"private": true`, ships inside Tauri desktop bundle, not on npm), `internal-only` (tooling/fixtures, neither bundled nor published). All current packages declare `agentskitos.distribution: "public"`. CI lint `scripts/check-distribution.mjs` enforces field presence + private-flag pairing. No public API change.
