---
'@agentskit/os-core': patch
---

#200: add `evaluatePromptFirewallTiered` and `PROMPT_FIREWALL_TIERS` covering `off` / `log` / `block` / `block_and_alert`. Verdicts now carry `tier` and `alert` so callers can fan out a notification on the highest tier without re-evaluating the firewall.
