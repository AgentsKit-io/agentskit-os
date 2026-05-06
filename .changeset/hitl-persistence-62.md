---
'@agentskit/os-core': patch
---

#62: add `snapshotHitlInbox` + `restoreHitlInbox` + `HitlInboxSnapshot` schema — pure (de)serialization for the HITL inbox so the desktop UI can survive a reload without losing pending approvals. Storage layer (file/vault/cloud) stays a caller concern.
