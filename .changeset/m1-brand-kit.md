---
"@agentskit/os-core": minor
---

Land RFC-0004 (Accepted): `BrandKit` primitive + `validateAgainstBrandKit` output guard. Pure schema + decision logic; no LLM calls.

`BrandKit` covers:
- Voice (5 tones: formal/casual/playful/technical/empathetic, optional persona, good/bad examples)
- Vocabulary (preferred-term substitution, banned phrases with `severity: warn | block`, required disclaimers with trigger words + placement, glossary)
- Formatting (titleCase, oxfordComma, quoteStyle, emoji policy, length limits with per-channel overrides)
- Identity (productName, legalName, capitalizationRules, pronouns)

`validateAgainstBrandKit(text, kit, { channel? })` returns typed `BrandViolation[]` with codes `banned_phrase | preferred_term | missing_disclaimer | length_below_min | length_above_max | capitalization`. `hasBlockingViolation()` flags violations that should reject output.

New subpath export `@agentskit/os-core/brand/brand-kit`.
