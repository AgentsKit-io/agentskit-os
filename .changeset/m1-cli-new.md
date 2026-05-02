---
"@agentskit/os-cli": minor
---

Add `agentskit-os new <template-id> [<dir>]` command. Wires `@agentskit/os-templates` into CLI for one-command scaffolding from the starter gallery.

Flags:
- `--list` — browse all available templates with category + difficulty
- `--id <slug>` / `--name <name>` — override workspace identity
- `--force` — overwrite existing config
- `<dir>` positional defaults to cwd; when set, workspace id derived from basename

Outputs an `agentskit-os.config.yaml` with template's `agents[]` + `flows[]` baked in. Round-trips cleanly through `config validate`. Surfaces `Next:` hints pointing at the template's first flow id for `agentskit-os run`.

Exit codes: 0 ok, 2 usage / unknown template, 4 file exists.

`@agentskit/os-templates` added as `peerDependency`.
