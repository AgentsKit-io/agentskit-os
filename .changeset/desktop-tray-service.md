---
"@agentskit/desktop": patch
---

apps/desktop — D-3 system tray + service mode. Closing the main window
hides instead of quitting; tray exposes Show/Pause/Resume/Settings/Quit
and surfaces sidecar status. Opt-out via AGENTSKITOS_NO_TRAY=1.
