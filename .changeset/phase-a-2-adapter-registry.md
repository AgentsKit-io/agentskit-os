---
'@agentskit/os-runtime': minor
---

Phase A-2: add `createHttpLlmAdapter` (OpenAI-compatible chat-completions client) and `buildAdapterRegistryFromCreds`. Reads well-known secrets (`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `OPENROUTER_API_KEY` / `GROQ_API_KEY`) and routes `LlmCall.system` to the matching backend (Anthropic uses `x-api-key` + `anthropic-version`; others use Bearer). The desktop sidecar now constructs the adapter registry from the loaded workspace secrets and falls back to a stub when no creds are present.
