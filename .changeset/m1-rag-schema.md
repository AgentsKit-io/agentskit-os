---
'@agentskit/os-core': minor
---

Add `RagConfig` Zod schema wiring `@agentskit/rag` (chunker, loaders, vector stores, rerankers, hybrid search) into `WorkspaceConfig`. New `AgentConfig.ragRefs` field binds agents to pipelines. Closes the RAG coverage gap (AgentsKit-io/agentskit-os#158).

- 9 loader kinds: fs, web, pdf, notion, confluence, github, s3, firecrawl, plugin
- 9 vector stores: sqlite, turso, redis, file, pgvector, qdrant, pinecone, weaviate, plugin
- 7 reranker kinds: cohere, voyage, jina, cross-encoder, mmr, rrf, plugin
- Hybrid search (BM25/TFIDF/SPLADE × dense)
- ConfigRoot enforces unique pipeline ids + agent.ragRefs resolves to known pipelines
