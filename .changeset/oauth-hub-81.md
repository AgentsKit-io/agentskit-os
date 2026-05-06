---
'@agentskit/os-core': patch
---

#81: add `createOAuthHub` — pure OAuth provider registry + connection state machine + authorize-URL builder. State graph covers `pending` → `authorizing` → `connected` / `errored` → `revoked` with explicit allowed-edge enforcement; `buildAuthorizeUrl` emits a deterministic query-string the desktop / web visual integration hub redirects to.
