---
'@agentskit/os-observability': patch
---

#187: add `applyFieldRedaction` — pure helper that walks an arbitrary span/trace record and applies a redactor (e.g. one of the #439 named profiles) to every string value at the configured dot-path selectors. Wildcards (`*`) match any single segment so callers can target `spans.*.attributes.prompt`-style paths.
