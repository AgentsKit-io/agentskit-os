---
'@agentskit/os-core': patch
'@agentskit/os-flow': patch
---

#67: add `LlmBranchNode` (`kind: 'llm-branch'`) to the `FlowNode` union — model-driven router that picks one of `branches[].outcome` strings, optional `fallbackOutcome`. Visual editor (`VisualFlowNodeKind`), cost estimator, and `flow-diff` updated to recognise the new kind.
