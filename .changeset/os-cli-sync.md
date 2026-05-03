---
"@agentskit/os-cli": minor
---

Add `agentskit-os sync` command — keep core/plugins in sync with lockfile (issue #28).

- `agentskit-os sync` (no args / `--check`): reads `agentskit-os.lock`, compares declared plugin versions against installed packages, exits 1 if drift found.
- `agentskit-os sync --apply`: installs/upgrades packages to match the lockfile, then re-verifies.
- `agentskit-os sync --plugins-only` / `--core-only`: narrow the drift check to a subset.
- `--lock <path>`: override lockfile path.

Exports `Synchronizer` interface + `pnpmSynchronizer` default for host injection in tests and custom runtimes. Pure `computeDrift` function is independently testable. Structured error codes: `os.cli.sync_drift`, `os.cli.sync_missing_lockfile`, `os.cli.sync_install_failed`.

Exit codes: 0 = in sync, 1 = drift / error, 2 = usage error.
