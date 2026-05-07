---
'@agentskit/os-coding-agents': minor
'@agentskit/os-core': patch
---

Phase A-3: add `createOpenRouterProvider` — HTTP-based coding-agent provider that drives OpenRouter chat-completions and surfaces the response as a `CodingTaskResult`. Registered as the `openrouter` built-in (so `BUILTIN_CODING_AGENT_IDS` now lists it). `CodingAgentInvocationModel` enum gains an `'http'` variant.
