# @agentskit/os-plugins

## 1.0.0-alpha.0

### Minor Changes

- 103881c: Scaffold `@agentskit/os-plugins` package — plugin loader, manifest fetcher, permission evaluator. Eighth public package. Pure decision logic; no execution / sandboxing in M1.

  `ManifestFetcher` interface + `InMemoryManifestFetcher` reference impl. Real backends (npm, GitHub, marketplace HTTP, file) implement the same shape.

  `evaluateManifestPermissions(manifest, policy?)` partitions plugin permissions into `autoGranted | toPrompt | denied` decisions per `RFC-0001` + ADR-0006. `decidePermission` accepts `GrantPolicy` (`autoGrantPrefixes`, `denyPrefixes`, `requireUserPromptForVault`). Default: prompt. `vault:*` always prompts unless explicitly disabled. `denyPrefixes` overrides auto-grant.

  `tightenConstraints(requested, granted)` picks most restrictive of two `CapabilityConstraints` (lower `rateLimit`, lower `budget`, earlier `expiresAt`).

  `loadPlugin(source, expectedIntegrity, opts)`:

  - Fetches manifest via injected `ManifestFetcher`
  - Verifies integrity hash if provided
  - Enforces `requireSignedPlugins`
  - Calls injected `verifySignature` when manifest is signed
  - Checks `enginesOs` against host `EXTENSION_API_VERSION` via `isApiCompatible`
  - Evaluates permissions; rejects when any `required: true` denied
  - Registers `contributes[]` on `PluginRegistry`; surfaces conflicts as `plugin.registry_conflict`

  Returns `LoadResult` with typed `LoadErrorCode`: `plugin.not_found | plugin.integrity_mismatch | plugin.signature_required | plugin.signature_invalid | plugin.api_incompatible | plugin.permission_denied | plugin.registry_conflict | plugin.required_permission_denied`.

  `filterDangerousPermissions` helper flags `vault:*` and `net:fetch:any` for prominent UI surfacing.

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
