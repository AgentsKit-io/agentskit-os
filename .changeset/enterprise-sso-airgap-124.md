---
'@agentskit/os-core': patch
---

#124: add `EnterpriseDeployment` schema (`cloud-shared` / `cloud-isolated-tenant` / `self-host-online` / `self-host-airgap`) plus `verifyEnterpriseDeployment` — checks the deployment mode against the workspace `CloudSyncConfig` and flags consistency issues (airgap flag mismatch, missing controlPlaneHost on self-host, SAML SSO without domain). Coerces `outboundModelTraffic` to false on airgap mode.
