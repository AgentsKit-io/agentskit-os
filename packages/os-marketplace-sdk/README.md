# @agentskit/os-marketplace-sdk

Plugin publishing helpers. Manifest builder, integrity hashing, signing, bundle metadata. Pure logic; HTTP transports plug in.

## Status

Pre-1.0 alpha. M5 ships HTTP-marketplace + npm + GitHub-release publishers.

## API

- `canonicalJson` / `sha256OfBytes` / `sha512OfBytes` / `sha256OfCanonical` / `sha512OfCanonical`
- `buildManifest(raw, { signer? })` — validates + optionally signs
- `stripSignature(manifest)` — re-strip for re-signing flows
- `buildBundle(manifest, assets)` — per-asset SHA-256 + bundle SHA-512
- `verifyAsset` / `verifyBundleArchive`
- `Publisher` interface + `InMemoryPublisher` (immutable id@version)

## License

MIT
