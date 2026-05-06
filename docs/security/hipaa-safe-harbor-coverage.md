# HIPAA Safe Harbor 18-identifier coverage (#182)

This document maps the 18 HIPAA Safe Harbor de-identifiers (45 CFR §164.514(b)(2))
to the redaction primitives currently shipped in `@agentskit/os-core` (#439) and
records which identifiers still need additional rules before the
`hipaa-safe-harbor` profile can be considered complete.

> **Not legal advice.** Validated PHI tooling and a privacy/legal sign-off
> remain required for production HIPAA workloads. This document tracks the
> engineering surface only.

---

## Scope

The `hipaa-safe-harbor` profile shipped in #439 covers a *subset* of the
identifiers and is intentionally tighter on signals our agents can leak in
prompts, traces, and run artifacts. Identifiers that primarily live in
structured EHR fields (rather than free text) are out of scope for the regex
profile; those records should not be passed through prompt or trace surfaces
in the first place.

## Coverage matrix

| # | Safe Harbor identifier | Profile rule(s) | Status |
|---|------------------------|------------------|--------|
| 1 | Names | (none) | **Gap** — high false-positive risk in regex form. Track via #461. |
| 2 | Geographic subdivisions smaller than state | (none) | **Gap** — needs gazetteer; track via #461. |
| 3 | Dates (DOB, admission, discharge) finer than year | `dob` (ISO `YYYY-MM-DD`) | Partial — extend to MM/DD/YYYY + textual months. |
| 4 | Phone numbers | `phone.e164`, `phone.us` | **Covered** |
| 5 | Fax numbers | `phone.e164`, `phone.us` | Covered (same patterns; semantic distinction lost). |
| 6 | Email addresses | `email` | **Covered** |
| 7 | Social Security numbers | `ssn` | **Covered** |
| 8 | Medical record numbers | `medical-record-number` | **Covered** |
| 9 | Health plan beneficiary numbers | (none) | **Gap** — plan-issuer-specific format. Track via #461. |
| 10 | Account numbers | `credit-card` | Partial — generic account-number patterns missing. |
| 11 | Certificate/license numbers | (none) | **Gap** — out of scope for regex. |
| 12 | Vehicle identifiers (VIN, license plate) | (none) | **Gap** — track via #461. |
| 13 | Device identifiers / serial numbers | (none) | **Gap** — track via #461. |
| 14 | URLs | `url.token-query` | Partial — masks query token only, not the URL itself. |
| 15 | IP addresses | `ip.ipv4` | Covered for IPv4. IPv6 is a known gap. |
| 16 | Biometric identifiers | n/a | Out of scope for text redaction. |
| 17 | Full-face photographs | n/a | Out of scope (binary content; redact at upload). |
| 18 | Any other unique identifying number / characteristic / code | (none) | Catch-all — application-specific. |

## What changed in #182

- This document.
- Threat model § 4.4 now links here.
- `hipaa-safe-harbor` profile in #439 stays the same — gaps tracked separately
  to avoid landing high-false-positive regexes (#1, #2, #11) in the default
  profile.

## Operational guidance

- Apply `hipaa-safe-harbor` via `applyRedactionProfile` on **every** trace
  exporter and on `CodingRunArtifactsOpts.redact` (#367) when the workspace
  policy requires it.
- Pair with `applyFieldRedaction` (#187) so structured records — not just
  free text — are scrubbed.
- Disallow PHI in run prompts at policy level (#336); redaction is the
  defense-in-depth layer, not the primary control.

## References

- 45 CFR §164.514(b)(2) — Safe Harbor de-identification standard.
- [`docs/security/threat-model-external-coding-agents.md`](./threat-model-external-coding-agents.md) §4.4
- `packages/os-core/src/security/redaction-profiles.ts` (#439)
- `packages/os-observability/src/field-redaction.ts` (#187)
