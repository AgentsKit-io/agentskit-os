# @agentskit/os-templates

## 1.0.0-alpha.0

### Minor Changes

- 90dc3da: Scaffold `@agentskit/os-templates` package — starter template gallery. Tenth public package.

  5 M1 templates spanning 5 categories:

  - `pr-review` (coding, beginner) — GitHub PR fetch + review agent + comment
  - `marketing-3way-compare` (marketing, intermediate) — 3 copywriter voices + brand judge via `compare` node
  - `research-summary` (research, intermediate) — web search → researcher → critic → summarizer
  - `support-triage` (support, intermediate) — classifier → condition → billing/tech/HITL escalation
  - `clinical-consensus` (clinical, advanced) — 3-agent vote with judge tiebreak + physician HITL gate

  Every template ships with: `id`, `name`, `description`, `category`, `tags`, `difficulty`, `version`, validated `agents[]`, validated `flows[]`. Tests verify schema parse + entry-resolves + agent-ref-resolves.

  `builtInTemplates`, `findTemplate(id)`, `listTemplates({category?, tag?})`, `allTags()`, `allCategories()`.

  Demonstrates compare/vote/condition/HITL nodes from RFC-0003 + os-core schemas.

  Consumes `@agentskit/os-core` as `peerDependency`.

### Patch Changes

- Updated dependencies [8167412]
- Updated dependencies [39d14db]
- Updated dependencies [4e2496a]
- Updated dependencies [e496ac7]
- Updated dependencies [9fedb8d]
- Updated dependencies [aad7f5b]
- Updated dependencies [2c2fd18]
  - @agentskit/os-core@0.4.0-alpha.0
