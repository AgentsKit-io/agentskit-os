---
'@agentskit/os-core': patch
---

#128: add `evaluateRbac` + `allowedActionsFor` — pure RBAC verdict over `(seat, action)` pairs using the existing `RbacRole` (viewer / editor / admin / owner). Returns `seat_not_found` when no seat matches the email; `role_lacks_action` for permission denials.
