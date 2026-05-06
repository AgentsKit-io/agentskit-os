---
'@agentskit/os-coding-agents': patch
---

#441: add `verifyBinaryAttestation` + `sha256OfFile` primitives in `@agentskit/os-coding-agents`. `BinaryAttestation` records carry expected install path, allowlisted prefixes, and SHA-256, and the verifier returns granular failure reasons for audit logs.
