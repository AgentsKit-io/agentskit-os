import { describe, expect, it } from 'vitest'
import {
  buildBundle,
  buildManifest,
  verifyAsset,
  verifyBundleArchive,
} from '../src/index.js'

const manifestRaw = {
  id: 'web-search',
  name: 'Web Search',
  version: '1.0.0',
  source: 'npm:@agentskit/tool-web-search',
  contributes: ['tool'],
}

describe('buildBundle', () => {
  it('hashes each asset', async () => {
    const m = await buildManifest(manifestRaw)
    const b = await buildBundle(m, [
      { path: 'a.js', bytes: new TextEncoder().encode('console.log(1)') },
      { path: 'b.js', bytes: new TextEncoder().encode('console.log(2)') },
    ])
    expect(b.assets).toHaveLength(2)
    expect(b.assets[0]?.integrity).toMatch(/^sha256:/)
    expect(b.assets[0]?.size).toBeGreaterThan(0)
  })

  it('sorts asset records by path', async () => {
    const m = await buildManifest(manifestRaw)
    const b = await buildBundle(m, [
      { path: 'z.js', bytes: new TextEncoder().encode('z') },
      { path: 'a.js', bytes: new TextEncoder().encode('a') },
      { path: 'm.js', bytes: new TextEncoder().encode('m') },
    ])
    expect(b.assets.map((a) => a.path)).toEqual(['a.js', 'm.js', 'z.js'])
  })

  it('produces sha512 bundleIntegrity', async () => {
    const m = await buildManifest(manifestRaw)
    const b = await buildBundle(m, [{ path: 'a.js', bytes: new TextEncoder().encode('a') }])
    expect(b.bundleIntegrity).toMatch(/^sha512:[0-9a-f]{128}$/)
  })

  it('different asset content → different bundleIntegrity', async () => {
    const m = await buildManifest(manifestRaw)
    const b1 = await buildBundle(m, [{ path: 'a.js', bytes: new TextEncoder().encode('a') }])
    const b2 = await buildBundle(m, [{ path: 'a.js', bytes: new TextEncoder().encode('b') }])
    expect(b1.bundleIntegrity).not.toBe(b2.bundleIntegrity)
  })

  it('order-invariant for asset list', async () => {
    const m = await buildManifest(manifestRaw)
    const a = { path: 'a.js', bytes: new TextEncoder().encode('a') }
    const b = { path: 'b.js', bytes: new TextEncoder().encode('b') }
    const r1 = await buildBundle(m, [a, b])
    const r2 = await buildBundle(m, [b, a])
    expect(r1.bundleIntegrity).toBe(r2.bundleIntegrity)
  })
})

describe('verifyAsset', () => {
  it('matches when bytes unchanged', async () => {
    const bytes = new TextEncoder().encode('hello')
    const m = await buildManifest(manifestRaw)
    const b = await buildBundle(m, [{ path: 'h.txt', bytes }])
    expect(await verifyAsset(b.assets[0]!.integrity, bytes)).toBe(true)
  })

  it('rejects when bytes tampered', async () => {
    const bytes = new TextEncoder().encode('hello')
    const m = await buildManifest(manifestRaw)
    const b = await buildBundle(m, [{ path: 'h.txt', bytes }])
    expect(await verifyAsset(b.assets[0]!.integrity, new TextEncoder().encode('tamper'))).toBe(
      false,
    )
  })
})

describe('verifyBundleArchive', () => {
  it('reports archive hash and ok-flag', async () => {
    const m = await buildManifest(manifestRaw)
    const b = await buildBundle(m, [{ path: 'h.txt', bytes: new TextEncoder().encode('h') }])
    const archive = new TextEncoder().encode('mock archive bytes')
    const r = await verifyBundleArchive(b, archive)
    expect(r.archiveHash).toMatch(/^sha512:/)
    // archive bytes are not the bundle's expected sha512(canonicalized manifest+assets)
    expect(r.ok).toBe(false)
  })
})
