---
'@agentskit/os-headless': minor
---

Phase A-5: add `createOAuthCallbackServer` — finishes the `OAuthConnection` state machine after a 1-click OAuth redirect lands. Listens on `GET /oauth/callback?code&state`, looks up the in-flight `PendingOAuthFlow` via the caller-supplied `getPending`, exchanges the authorization code at the provider's token URL, transitions the `OAuthHubRegistry` connection to `connected` (or `errored`), and hands the access/refresh tokens to `onConnected` so the host app can persist them in its vault.
