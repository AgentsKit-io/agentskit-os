# Agentic Development Guardrails

AgentsKitOS is the composition layer above AgentsKit. Every feature must prove
which contract it consumes, which OS package owns the orchestration, and which
UI surface merely operates that contract.

## North Star

AgentsKit provides the pieces: adapters, runtime, tools, memory, RAG, skills,
observability, evals, sandbox, and CLI. AgentsKitOS turns those into a usable
operating system for agent work:

- SDLC orchestration for dev teams,
- domain automation for non-technical teams,
- governed RAG and workflow automation for regulated environments,
- provider comparison, delegation, HITL, cost controls, and auditability.

## What Is Going Wrong

The current drift is not a lack of effort. It is a layering problem:

- desktop screens are ahead of the contracts they should operate;
- many hooks fall back to `MOCK_*` production data;
- several IPC calls use `sidecarRequest<unknown>`, hiding contract drift;
- "Preview data" appears in production surfaces instead of an explicit fixture
  mode;
- implementation work is spread across many surfaces without a single vertical
  path from AgentsKit binding to headless runner to desktop action.

This creates a polished prototype feeling instead of a reliable OS.

## Required Development Shape

Every meaningful feature must land as a vertical slice:

1. **Contract:** DTO/Zod schema in the owning package.
2. **Headless behavior:** command or service usable without desktop UI.
3. **Desktop binding:** typed IPC/client hook.
4. **User surface:** screen, panel, or command palette action.
5. **Evidence:** tests, trace/audit/cost events where relevant.

No PR should add a primary user-facing screen that only talks to mock data.

## Agent Rules

- Start from an issue with acceptance criteria and a test plan.
- Check AgentsKit docs before creating primitives that may already exist.
- Keep package ownership narrow; do not add orchestration logic inside UI.
- Do not add `any`, nested ternaries, or untyped sidecar calls.
- Do not increase the architecture baseline.
- Update docs and contracts in the same PR as behavior.

## Local Checks

Run before handing work back:

```bash
pnpm check:quality-gates
pnpm lint
pnpm test
```

When intentionally paying down debt:

```bash
node scripts/check-architecture-guardrails.mjs --update-baseline
```

Baseline updates should reduce or explain debt. They are not a shortcut for
adding new disconnected UI.
