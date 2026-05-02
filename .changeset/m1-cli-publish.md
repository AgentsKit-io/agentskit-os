---
"@agentskit/os-cli": minor
---

Add `agentskit-os publish [<dir>] [--manifest] [--assets] [--out] [--unsigned]` command. Wires `@agentskit/os-marketplace-sdk` into CLI.

Builds a marketplace bundle from a plugin source directory. Default flow:
- Reads `<dir>/agentskit-os.plugin.yaml` as manifest
- Reads `<dir>/dist/` as flat asset directory
- Writes `<dir>/agentskit-os.bundle.json` with manifest + per-asset SHA-256 + bundle SHA-512

Refuses unsigned manifests by default. `--unsigned` allows dev/internal bundles.

`CliIo` extended with optional `readBinary` + `readdir`. Fake IO updated to mirror.

Real upload to npm / GitHub / marketplace HTTP lands in M5 via `os-marketplace-sdk` Publisher backends.

Exit codes: 0 ok, 1 build error, 2 usage, 3 read error.

`@agentskit/os-marketplace-sdk` added as `peerDependency`.
