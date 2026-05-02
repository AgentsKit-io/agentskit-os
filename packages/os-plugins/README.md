# @agentskit/os-plugins

Plugin loader, manifest fetcher, permission evaluator. Pure decision logic; no execution or sandboxing in M1.

## Status

Pre-1.0 alpha.

## API

- `ManifestFetcher` interface + `InMemoryManifestFetcher` reference impl
- `evaluateManifestPermissions` — partition permissions by `auto-grant | prompt-user | deny`
- `tightenConstraints` — pick most restrictive `CapabilityConstraints`
- `loadPlugin(source, expectedIntegrity, opts)` — fetch + verify + register

Sandbox/execution lands in M2 via separate `os-sandbox` package.

## License

MIT
