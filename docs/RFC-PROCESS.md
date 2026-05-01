# RFC Process

RFCs are required for: any breaking change to public contracts, new package, new top-level config field, change to plugin API, security/observability shape change.

## When NOT an RFC

Internal refactors, bug fixes, docs, examples, test improvements, perf work that doesn't change public types.

## Flow

1. Draft → `docs/rfc/NNNN-title.md` (use `_template.md`). Open PR labeled `type:rfc`.
2. Discussion period: minimum **7 days** open for feedback. No merge before 7 days.
3. Maintainer call: **accept**, **reject**, or **needs-revision**.
4. On accept: PR merges, RFC status set to `Accepted`, issue created to track implementation.
5. Implementation PR references RFC. Cannot merge until RFC is `Accepted`.
6. After ship: RFC status → `Implemented` with link to release.

## States

`Draft` → `Discussion` → `Accepted` | `Rejected` | `Withdrawn` → `Implemented` | `Superseded`.

## Template fields

- Summary (1 paragraph).
- Motivation (problem, who is affected).
- Detailed design (types, schema, examples).
- Alternatives considered.
- Drawbacks.
- Migration path (mandatory if breaking).
- Security & privacy impact.
- Open questions.

## Difference from ADR

- **ADR** — internal architectural decision, no public-API change. Lighter process.
- **RFC** — anything user-facing or contract-shaping. Heavier process.

When in doubt: RFC.
