# @agentskit/os-templates

Starter template gallery for AgentsKitOS. Each template is a `ConfigRoot` fragment with agents + flows + tags.

## Status

Pre-1.0 alpha. M1 ships 5 starter templates; full 50+ gallery in M5.

## Templates

| ID | Category | Difficulty |
|---|---|---|
| `pr-review` | coding | beginner |
| `marketing-3way-compare` | marketing | intermediate |
| `research-summary` | research | intermediate |
| `support-triage` | support | intermediate |
| `clinical-consensus` | clinical | advanced |

## API

```ts
import { builtInTemplates, findTemplate, listTemplates } from '@agentskit/os-templates'

const t = findTemplate('pr-review')
const codingTemplates = listTemplates({ category: 'coding' })
const ragTemplates = listTemplates({ tag: 'rag' })
```

## License

MIT
