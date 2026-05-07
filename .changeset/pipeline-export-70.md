---
'@agentskit/os-flow': patch
---

#70: add `buildPipelineExport` — pure builder that emits the file artifact set for a pipeline export. `target: 'docker'` produces a Dockerfile + `flow.json`; `target: 'exe'` produces a `start.sh` runner. Caller writes artifacts to disk and invokes the platform packager (`docker build` / `pkg` / `nexe`).
