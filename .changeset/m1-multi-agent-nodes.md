---
"@agentskit/os-core": minor
---

Land RFC-0003 (Accepted): five multi-agent pattern nodes added to `FlowNode` discriminated union.

- `compare` — fan-out, side-by-side; selection mode `manual | eval | judge | first | all`
- `vote` — odd-count consensus (zod superRefine); ballot `majority | weighted | unanimous | quorum`; `onTie=judge` requires `judgeAgent`
- `debate` — proponent + opponent + judge; rounds 1–6; format `open | point-counterpoint | cross-examination`
- `auction` — bidders compete on `lowest-cost | highest-confidence | fastest | custom`; reserve price + fallback + timeout
- `blackboard` — shared scratchpad (in-memory / sqlite / memory-store ref); schedule `round-robin | volunteer | priority`; termination `rounds | consensus | agent-signal | budget`

Strictly additive — existing flows still validate. New configs require new code to read.
