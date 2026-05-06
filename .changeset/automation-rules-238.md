---
'@agentskit/os-flow': patch
---

#238: add `AutomationRuleSet` grammar (`when` event matcher × `run` flow action with optional `inputTemplate`) and `matchAutomationRules` — pure matcher that returns one `AutomationDispatch` per rule that fires for an `AutomationEvent`. Caller-managed `lastFiredAt` ledger backs the per-rule `cooldownMs`. Lays the schema for "when X event, run Y flow" automations.
