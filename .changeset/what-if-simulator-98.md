---
'@agentskit/os-flow': patch
---

#98: add `simulateWhatIf` — pure flow simulator that replays a recorded `RecordedRunTrace` against a candidate `FlowConfig`. Reports node/edge diffs, per-node projected status from a caller-supplied `NodeOutcomeProjector`, and projected cost delta vs. the recorded run.
