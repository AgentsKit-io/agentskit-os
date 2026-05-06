---
'@agentskit/os-core': patch
---

#439: add named redaction profiles (`default`, `pii-strict`, `hipaa-safe-harbor`) plus `applyRedactionProfile` + `createRedactor` helpers. Profiles are pure regex-driven `(s) => string` redactors compatible with the trace-export pipeline and `CodingRunArtifactsOpts.redact` (#367).
