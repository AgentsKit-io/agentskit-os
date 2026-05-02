---
"@agentskit/os-cli": minor
---

Add `agentskit-os lock <config-path> [--check] [--out <path>]` command. Generates `agentskit-os.lock` next to the config (or at `--out`) covering plugins, agents, flows, providers, schemas. Uses `canonicalJson` + `sha256OfCanonical` from `@agentskit/os-core/lockfile/lock`.

`--check` mode loads existing lockfile, runs `detectLockDrift` against current config + plugins, exits 5 with typed drift codes if mismatch. Exits 0 when matches.

Exit codes: 0 ok / no drift, 1 invalid config, 2 usage, 3 read, 5 drift detected.
