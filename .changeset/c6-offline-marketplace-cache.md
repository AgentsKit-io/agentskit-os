---
"@agentskit/os-core": minor
---

Add an offline-first marketplace cache primitive: `MarketplaceCacheEntry` / `MarketplaceCacheSnapshot` schemas, `decideMarketplaceSource` (live / cache / unavailable decision rule honoring air-gap, offline, and stale-live states), and `mergeMarketplaceSnapshot` (preserves entries the live source omitted to survive transient de-lists). Lays the foundation for offline marketplace browsing without exposing a live network as a single point of failure.
