---
"@agentskit/os-core": minor
---

Add opt-in activation + retention metrics primitives: `ActivationEvent` schema (workspace.created/first_agent_created/first_provider_connected/first_run_succeeded/first_pr_generated/repeat_run), `decideEmitActivation` (gates emission behind the existing telemetry consent), `buildActivationFunnel`, and `buildRetentionCohorts`. No prompts/secrets/code/PHI/PII captured; workspace ids are required to be hex-digested before emission.
