---
'@agentskit/os-core': patch
---

#443: add `evaluatePromptFirewall` runtime + a curated `PROMPT_FIREWALL_CORPUS` of injection vectors covering issue, PR comment, webhook, docstring, and memory sources. Regression suite under `packages/os-core/tests/security/prompt-firewall-corpus.test.ts` exercises every entry against a representative blocklist.
