---
'@agentskit/os-core': patch
---

#71 / #72 / #73 / #75 / #77 / #78: register built-in `TriggerContract`s for cron, webhook, file, slack, github, and linear trigger kinds. Each contract validates the schema-level config and emits a deterministic `dispatched` outcome; caller wires the actual scheduler / webhook server / file watcher / Slack / GitHub / Linear adapter at the runtime boundary. `registerBuiltinTriggerContracts(registry)` mounts every built-in in one call.
