---
'@agentskit/os-core': patch
---

#461: add `hipaa-safe-harbor-extended` redaction profile that layers best-effort regexes for VIN, license plates, device serials, account numbers, and license/certificate numbers on top of the core `hipaa-safe-harbor` rules. Opt-in profile — higher false-positive risk than the core preset; tracks the gaps documented in `docs/security/hipaa-safe-harbor-coverage.md`.
