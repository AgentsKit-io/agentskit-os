// Pluggable manifest fetcher. Resolves PluginConfig.source URI to raw JSON.
// Real backends: npm registry, GitHub releases, local file, marketplace HTTP.
// In-memory fetcher provided for testing.

import {
  parsePluginConfig,
  type PluginConfig,
} from '@agentskit/os-core/schema/plugin'

export type FetchResult =
  | { kind: 'ok'; manifest: PluginConfig; integrity: string }
  | { kind: 'not_found'; source: string }
  | { kind: 'integrity_mismatch'; expected: string; actual: string }

export interface ManifestFetcher {
  fetch(source: string): Promise<FetchResult>
}

export class InMemoryManifestFetcher implements ManifestFetcher {
  private byUri = new Map<string, { manifest: PluginConfig; integrity: string }>()

  register(source: string, manifest: PluginConfig, integrity: string): void {
    this.byUri.set(source, { manifest, integrity })
  }

  async fetch(source: string): Promise<FetchResult> {
    const entry = this.byUri.get(source)
    if (!entry) return { kind: 'not_found', source }
    return { kind: 'ok', manifest: entry.manifest, integrity: entry.integrity }
  }
}

export const validateManifestShape = (raw: unknown): PluginConfig => parsePluginConfig(raw)
