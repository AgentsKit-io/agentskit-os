---
'@agentskit/os-observability': patch
---

#108: add `BUILTIN_ANOMALY_RULES` + `defaultAnomalyRuleSet` + `ANOMALY_PRESET_IDS` — out-of-the-box anomaly presets covering cost spikes (3× baseline), cost budget breach, runaway tool-call rate, and high error rate. Pairs with `evaluateAnomalyRules` from #215; dogfood pipelines mount the default set in one call.
