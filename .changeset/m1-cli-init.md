---
"@agentskit/os-cli": minor
---

Add `init` command. Scaffolds an AgentsKitOS workspace: writes `agentskit-os.config.yaml` (minimal valid `ConfigRoot`), creates `.agentskitos/` runtime directory, and adds a `.gitignore` if missing. Inferred `id` is slugified `basename(<dir>)`. `--id`, `--name`, `--force`, and a positional `<dir>` flags supported. Output config round-trips through `config validate`.

`CliIo` extended with `writeFile`, `mkdir`, and `exists` (Node-fs implementations in `defaultIo`, fake-fs helper in tests).
