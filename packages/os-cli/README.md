# @agentskit/os-cli

AgentsKitOS CLI. Pre-1.0 alpha.

## Install (when published)

```bash
pnpm add -D @agentskit/os-cli
```

## Commands

| Command | Status |
|---|---|
| `agentskit-os init` | M1 alpha |
| `agentskit-os run <config> --flow <id>` | M1 alpha |
| `agentskit-os doctor` | M1 alpha |
| `agentskit-os config validate <path>` | M1 alpha |
| `agentskit-os config explain --<layer> <path>...` | M1 alpha |
| `agentskit-os config diff <prev> <next>` | M1 alpha |
| `agentskit-os config migrate <path>` | M1 alpha |
| `agentskit-os --version` | M1 alpha |
| `agentskit-os --help` | M1 alpha |
| `agentskit-os deploy` | planned |
| `agentskit-os sync` | planned |
| `agentskit-os lock` | planned |

## Exit codes

| Code | Meaning |
|---|---|
| 0 | success |
| 1 | schema / parse error / flow failed |
| 2 | usage error (unknown command, missing arg, --help) |
| 3 | read / I/O error |
| 4 | flow paused (HITL or budget) |
| 70 | unhandled fatal |

## License

MIT
