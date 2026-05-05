---
---

Add a desktop `useAppUpdater` hook with a typed state machine (idle, checking, available, downloading, ready, installed, rolled-back, error, up-to-date) backed by sidecar methods `app.update.check/download/install/rollback`. Native Tauri updater wiring is queued for a follow-up; this PR delivers the JS contract and unit coverage so the UI surface can be built independently.
