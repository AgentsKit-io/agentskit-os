---
'@agentskit/os-core': patch
---

#111: add `buildComplianceExportBundle` — pure builder that assembles a regime-aware (`soc2` / `hipaa` / `gdpr`) evidence bundle from the audit chain, HITL decisions, workspace policy snapshot, active redaction profile id, and build metadata. Auto-generates a controls checklist mapping each regime control to the artifact id supplying its evidence. Storage layer ships the bundle.
