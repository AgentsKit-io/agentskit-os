---
'@agentskit/os-core': patch
---

#201: add `createPiiCategoryRegistry` + `applyPiiCategoryRegistry` — plugin-extensible PII category registry. Plugins register `PiiCategoryDefinition` records (id, label, regex, optional mask); the runtime calls `compile()` to drive a redaction pass over arbitrary text.
