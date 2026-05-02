// Publisher contract — abstract HTTP / file / npm-registry transport.
// Pure interface; real backends in M5 (HTTP marketplace, GitHub release,
// npm publish wrapper).

import type { Bundle } from './bundle.js'

export type PublishResult =
  | { kind: 'ok'; source: string; resolvedAt: string }
  | { kind: 'rejected'; reason: string }

export interface Publisher {
  readonly name: string
  publish(bundle: Bundle, archive: Uint8Array): Promise<PublishResult>
}

export class InMemoryPublisher implements Publisher {
  readonly name = 'in-memory'
  private readonly published = new Map<string, { bundle: Bundle; archive: Uint8Array; at: string }>()

  async publish(bundle: Bundle, archive: Uint8Array): Promise<PublishResult> {
    const key = `${bundle.manifest.id}@${bundle.manifest.version}`
    if (this.published.has(key)) {
      return { kind: 'rejected', reason: `version ${key} already published (immutable)` }
    }
    const at = new Date().toISOString()
    this.published.set(key, { bundle, archive, at })
    return { kind: 'ok', source: `marketplace:${bundle.manifest.id}`, resolvedAt: at }
  }

  fetch(id: string, version: string): { bundle: Bundle; archive: Uint8Array; at: string } | undefined {
    return this.published.get(`${id}@${version}`)
  }

  list(): readonly string[] {
    return [...this.published.keys()]
  }
}
