---
"@agentskit/os-core": minor
---

Add `RagConfig` schema. Composed of `ChunkerConfig` (5 strategies: fixed/sentence/paragraph/semantic/markdown), `EmbeddingsConfig` (provider + model + dimensions + batchSize), 4 loader kinds (`file`, `url`, `sql`, `api`) discriminated on `kind`, and `RetrieverConfig` (topK, similarityThreshold, hybridSearch, optional `RerankerConfig` for cohere/jina/voyage/cross-encoder/graph).

`ConfigRoot.rag: RagConfig[]` (default `[]`). Cross-reference validation: every `rag.store` must point to a real key in `memory`. Unique-id check across the rag array.

New subpath export `@agentskit/os-core/schema/rag`. Closes the AGENTSKIT-COVERAGE action item for RAG primitives in os-core.
