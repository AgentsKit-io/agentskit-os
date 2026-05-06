---
'@agentskit/os-core': patch
---

#190: add `SandboxBackend` contract + `createSandboxRegistry` — pluggable multi-runtime sandbox surface (`docker` / `firecracker-vm` / `webcontainer` / `e2b` / `noop`). Each backend declares `capabilities` (fs_isolation, network_egress_off, memory/cpu/timeout limits, biometric_unlock); `pick(required)` resolves the first registered backend that covers the policy.
