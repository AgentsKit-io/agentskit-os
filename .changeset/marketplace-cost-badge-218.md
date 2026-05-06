---
'@agentskit/os-marketplace-sdk': patch
---

#218: add `buildPluginCostBadge` for the marketplace "$/run" badge. Pure helper that derives `avgCostPerRun`, tier (`free`/`cheap`/`standard`/`expensive`), and a display label from `totalCostUsd` + `runCount`. Returns `null` when there is not enough data so the marketplace can omit the badge.
