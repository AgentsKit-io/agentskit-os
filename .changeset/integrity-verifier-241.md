---
'@agentskit/os-core': patch
---

#241: add `verifyDataIntegrity` — pure cross-section verifier that checks the audit chain (prev-hash + Merkle root + signed digest), memory records (content hash), and lockfile entries (integrity algorithm + diverging duplicates). Returns one report with per-issue codes the CLI can render.
