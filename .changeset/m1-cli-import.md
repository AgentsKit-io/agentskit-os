---
"@agentskit/os-cli": minor
---

Add `agentskit-os import <input> [--out] [--source] [--workspace] [--quiet]` command. Wires `@agentskit/os-import` into CLI per Epic 2 C-5.

- Reads JSON/YAML input via shared loader
- Auto-detects importer (n8n / Langflow / Dify) or honors `--source` override
- Translates to `ConfigRoot`, validates against schema, emits as YAML
- Prints to stdout by default; `--out <path>` writes to file
- `--workspace <id>` overrides imported workspace id
- `--quiet` suppresses warning summary
- Reports translation errors with code 1, usage errors with 2

`@agentskit/os-import` added as `peerDependency`.
