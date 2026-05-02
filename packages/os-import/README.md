# @agentskit/os-import

Migration importers for AgentsKitOS. Pure transformation, no I/O.

## Status

Pre-1.0 alpha. M1 ships **n8n** importer fully; **Langflow** + **Dify** are detect-only placeholders (parse stubs raise).

## Importers

| Source | detect | parse |
|---|---|---|
| n8n | ✓ | ✓ |
| Langflow | ✓ | M2 |
| Dify | ✓ | M2 |

## Usage

```ts
import { importWorkflow } from '@agentskit/os-import'

const result = importWorkflow(jsonInput)
console.log(result.workspace.id, result.flows, result.warnings)
```

## License

MIT
