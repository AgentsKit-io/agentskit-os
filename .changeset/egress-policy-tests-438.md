---
'@agentskit/os-core': patch
---

#438: lock in workspace egress default-deny + blocklist drift detection. New regression suite asserts metadata-server endpoints stay denied even when the allowlist is misconfigured, and that the bare-wildcard `net:fetch:*` allowlist entry remains rejected at parse time.
