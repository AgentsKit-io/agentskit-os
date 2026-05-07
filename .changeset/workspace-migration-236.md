---
'@agentskit/os-core': patch
---

#236: add `buildWorkspaceBundle` + `verifyWorkspaceBundle` — pure (de)serialization + integrity verifier for workspace migration between machines/cloud. Bundles workspace + agents + flows + triggers + templates with a SHA-256 over the canonical body so re-export of unchanged content yields the same hash.
