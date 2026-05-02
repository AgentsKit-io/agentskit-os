---
"@agentskit/os-marketplace-sdk": minor
---

Scaffold `@agentskit/os-marketplace-sdk` package — plugin publishing helpers. Eleventh public package. Pure logic; HTTP transports plug in.

`integrity.ts`:
- `canonicalJson` (deterministic key sort)
- `sha256OfBytes` / `sha512OfBytes` / `sha256OfCanonical` / `sha512OfCanonical`
- `verifyIntegrity` (exact match)

`manifest-builder.ts`:
- `buildManifest(raw, { signer? })` — validates against `PluginConfig` schema; optionally signs via injected `ManifestSigner`
- `stripSignature` — for re-signing flows

`bundle.ts`:
- `buildBundle(manifest, assets)` — per-asset SHA-256, sorts records by path, computes bundle SHA-512 over canonical `{manifest, assets}`. Order-invariant input
- `verifyAsset` / `verifyBundleArchive`

`publisher.ts`:
- `Publisher` interface (transport-agnostic)
- `InMemoryPublisher` reference impl with immutable `id@version` semantics

Round-trip verified end-to-end: build manifest → bundle assets → publish → fetch returns identical bundle.

Consumes `@agentskit/os-core` as `peerDependency`.
