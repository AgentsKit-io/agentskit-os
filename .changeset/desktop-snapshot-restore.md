---
"@agentskit/desktop": patch
---

D-13 snapshot & restore desktop state. Bundles all desktop localStorage keys (prefs, shortcuts, theme, status line, notifications, focus, onboarding, workspaces) into a versioned JSON snapshot. Export downloads; import re-applies + reloads. Closes #47
