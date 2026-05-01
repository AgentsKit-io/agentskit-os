---
"@agentskit/os-core": minor
---

Add `MemoryConfig` discriminated union over 6 backends: `in-memory`, `file`, `sqlite`, `redis`, `vector` (lancedb/pgvector/qdrant/pinecone/weaviate), `localstorage`. Embeddings sub-config for vector stores. Vault-aware connection strings. New subpath export `@agentskit/os-core/schema/memory`.
