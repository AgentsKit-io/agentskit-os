# @agentskit/os-cli

AgentsKitOS CLI. Pre-1.0 alpha.

## Install (when published)

```bash
pnpm add -D @agentskit/os-cli
```

## Commands

| Command | Status |
|---|---|
| `agentskit-os config validate <path>` | M1 alpha |
| `agentskit-os --version` | M1 alpha |
| `agentskit-os --help` | M1 alpha |
| `agentskit-os init` | planned |
| `agentskit-os doctor` | planned |
| `agentskit-os run` | planned |
| `agentskit-os deploy` | planned |
| `agentskit-os sync` | planned |
| `agentskit-os config explain` | planned |
| `agentskit-os config diff` | planned |

## Exit codes

| Code | Meaning |
|---|---|
| 0 | success |
| 1 | schema / parse error |
| 2 | usage error (unknown command, missing arg, --help) |
| 3 | read / I/O error |
| 70 | unhandled fatal |

## License

MIT
