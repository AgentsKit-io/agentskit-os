# @agentskit/os-import

Migration importers for AgentsKitOS. Pure transformation, no I/O.

## Status

Pre-1.0 alpha. M1 ships **n8n** + **Langflow** importers fully; **Dify** is a detect-only placeholder (parse stub raises).

## Importers

| Source | detect | parse |
|---|---|---|
| n8n | ✓ | ✓ |
| Langflow | ✓ | ✓ |
| Dify | ✓ | M2 |

## Usage

```ts
import { importWorkflow } from '@agentskit/os-import'

const result = importWorkflow(jsonInput)
console.log(result.workspace.id, result.flows, result.warnings)
```

## License

MIT
