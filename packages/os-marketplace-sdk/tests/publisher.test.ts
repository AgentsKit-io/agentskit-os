import { describe, expect, it } from 'vitest'
import { InMemoryPublisher, buildBundle, buildManifest } from '../src/index.js'

const manifestRaw = {
  id: 'web-search',
  name: 'Web Search',
  version: '1.0.0',
  source: 'npm:@agentskit/tool-web-search',
  contributes: ['tool'],
}

describe('InMemoryPublisher', () => {
  it('publishes bundle + returns marketplace source', async () => {
    const p = new InMemoryPublisher()
    const m = await buildManifest(manifestRaw)
    const bundle = await buildBundle(m, [{ path: 'a.js', bytes: new TextEncoder().encode('a') }])
    const r = await p.publish(bundle, new TextEncoder().encode('archive'))
    expect(r.kind).toBe('ok')
    if (r.kind === 'ok') {
      expect(r.source).toBe('marketplace:web-search')
      expect(r.resolvedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    }
  })

  it('rejects re-publish of same id@version (immutable)', async () => {
    const p = new InMemoryPublisher()
    const m = await buildManifest(manifestRaw)
    const bundle = await buildBundle(m, [{ path: 'a.js', bytes: new TextEncoder().encode('a') }])
    await p.publish(bundle, new TextEncoder().encode('archive'))
    const r2 = await p.publish(bundle, new TextEncoder().encode('archive'))
    expect(r2.kind).toBe('rejected')
    if (r2.kind === 'rejected') expect(r2.reason).toContain('already published')
  })

  it('accepts new version of same id', async () => {
    const p = new InMemoryPublisher()
    const m1 = await buildManifest(manifestRaw)
    const m2 = await buildManifest({ ...manifestRaw, version: '1.1.0' })
    const b1 = await buildBundle(m1, [])
    const b2 = await buildBundle(m2, [])
    expect((await p.publish(b1, new TextEncoder().encode('a'))).kind).toBe('ok')
    expect((await p.publish(b2, new TextEncoder().encode('b'))).kind).toBe('ok')
    expect(p.list()).toHaveLength(2)
  })

  it('fetch retrieves published bundle', async () => {
    const p = new InMemoryPublisher()
    const m = await buildManifest(manifestRaw)
    const bundle = await buildBundle(m, [{ path: 'a.js', bytes: new TextEncoder().encode('a') }])
    await p.publish(bundle, new TextEncoder().encode('archive'))
    const fetched = p.fetch('web-search', '1.0.0')
    expect(fetched?.bundle.manifest.id).toBe('web-search')
  })

  it('fetch returns undefined for unknown', async () => {
    const p = new InMemoryPublisher()
    expect(p.fetch('ghost', '0.0.1')).toBeUndefined()
  })
})
