---
'@agentskit/os-marketplace-sdk': patch
---

#342: add `ProvenanceBundle` (SLSA attestation + SBOM + declared permissions), `diffPermissions` (added/removed/unchanged), and `evaluateProvenanceAgainstPolicy` (min SLSA level, denied-permission deny-list, SBOM license requirement). Pure helpers the marketplace install flow runs before extracting a bundle.
