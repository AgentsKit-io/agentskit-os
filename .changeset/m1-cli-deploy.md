---
"@agentskit/os-cli": minor
---

Add `agentskit-os deploy [<bundle>] [--assets <dir>] [--publisher <name>] [--dry-run]` — pairs with `agentskit-os publish` to close the publish-then-ship loop.

Default flow:
- Reads `<bundle>` (default `./agentskit-os.bundle.json`)
- Re-reads sibling `dist/` (override via `--assets`)
- Verifies each asset's size + SHA-256 against the bundle metadata
- Concatenates verified bytes into an archive
- Hands `(bundle, archive)` to the configured `Publisher`

Publishers in M1: `in-memory` (default). M5 adds `npm`, `github`, `http`.

`--dry-run` skips the publisher call but still runs full integrity verification — safe to use in CI.

Exit codes: 0 ok, 1 build error, 2 usage, 3 read error, 4 integrity error, 5 publisher rejected.

15 new tests including positive (verify + ship), tampered asset (size mismatch and hash mismatch with same size), missing asset, malformed bundle, override flags, and help/usage paths.
