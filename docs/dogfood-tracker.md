# Dogfooding Tracker

AgentsKitOS must be built using AgentsKit runtime wherever feasible. Track here.

| Feature | AgentsKit primitive used | Status |
|---|---|---|
| `agentskit-os init` interactive prompts | `@agentskit/runtime` agent | planned |
| `agentskit-os doctor` checks | `@agentskit/skills/auditor` | planned |
| Migration assistant | `@agentskit/runtime` + custom skill | planned |
| Generative OS (NL → agent) | `@agentskit/runtime` meta-agent | planned |
| Self-healing agents | `@agentskit/runtime` + observer | planned |
| Auto-doc generator | `@agentskit/skills/summarizer` | planned |
| Trace anomaly detection | `@agentskit/runtime` + observability hooks | planned |

Rule: if a feature could plausibly use AgentsKit primitives, it must — or document in this file why not.
