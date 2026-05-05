---
"@agentskit/os-core": minor
---

Add role-based operator workspace primitives in `@agentskit/os-core/security/operator-roles`: 4 frozen roles (clinician, account-manager, reviewer, operator), screen + action whitelists, helpers `canViewScreen`, `canPerformAction`, `visibleScreensForRole`, `allowedActionsForRole`, `hiddenScreensForRole`, and a Zod-validated `OperatorRoleAssignment`. Lets the desktop shell hide developer surfaces (flows/agents/security/evals/benchmark) for non-developer operators while still exposing queues/approvals/forms/dashboards.
