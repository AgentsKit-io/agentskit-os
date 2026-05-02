import { describe, expect, it } from 'vitest'
import {
  buildManifest,
  stripSignature,
  type ManifestSigner,
} from '../src/index.js'

const baseRaw = {
  id: 'web-search',
  name: 'Web Search',
  version: '1.0.0',
  source: 'npm:@agentskit/tool-web-search',
  contributes: ['tool'],
}

const fakeSigner: ManifestSigner = {
  sign: async (canonical) => ({
    algorithm: 'ed25519',
    publicKey: 'A'.repeat(64),
    signature: 'B'.repeat(64) + canonical.length.toString(36),
  }),
}

describe('buildManifest', () => {
  it('returns unsigned manifest when no signer', async () => {
    const m = await buildManifest(baseRaw)
    expect(m.id).toBe('web-search')
    expect(m.signature).toBeUndefined()
  })

  it('attaches signature when signer provided', async () => {
    const m = await buildManifest(baseRaw, { signer: fakeSigner })
    expect(m.signature).toBeDefined()
    expect(m.signature?.algorithm).toBe('ed25519')
  })

  it('throws on schema-invalid input', async () => {
    await expect(buildManifest({ ...baseRaw, version: 'bad' })).rejects.toThrow()
  })

  it('throws when signer returns short signature', async () => {
    const badSigner: ManifestSigner = {
      sign: async () => ({ algorithm: 'ed25519', publicKey: 'short', signature: 'short' }),
    }
    await expect(buildManifest(baseRaw, { signer: badSigner })).rejects.toThrow()
  })
})

describe('stripSignature', () => {
  it('returns manifest without signature field', async () => {
    const signed = await buildManifest(baseRaw, { signer: fakeSigner })
    const stripped = stripSignature(signed)
    expect(stripped.signature).toBeUndefined()
    expect(stripped.id).toBe(signed.id)
  })

  it('idempotent on already-unsigned manifest', async () => {
    const m = await buildManifest(baseRaw)
    const stripped = stripSignature(m)
    expect(stripped.signature).toBeUndefined()
  })
})
