import { describe, expect, it } from 'vitest'
import { route } from '../src/router.js'
import { fakeIo } from './_fake-io.js'

const signedManifestYaml = `id: web-search
name: Web Search
version: 1.0.0
source: npm:@agentskit/tool-web-search
contributes:
  - tool
signature:
  algorithm: ed25519
  publicKey: ${'A'.repeat(64)}
  signature: ${'B'.repeat(64)}
`

const unsignedManifestYaml = `id: web-search
name: Web Search
version: 1.0.0
source: npm:@agentskit/tool-web-search
contributes:
  - tool
`

describe('publish', () => {
  it('shows help', async () => {
    const r = await route(['publish', '--help'])
    expect(r.code).toBe(2)
    expect(`${r.stdout}${r.stderr}`).toContain('agentskit-os publish')
  })

  it('rejects unknown flag', async () => {
    const r = await route(['publish', '--cosmic'], fakeIo())
    expect(r.code).toBe(2)
    expect(r.stderr).toMatch(/unknown (flag|option)/i)
  })

  it('rejects missing manifest', async () => {
    const r = await route(['publish'], fakeIo())
    expect(r.code).toBe(3)
    expect(r.stderr).toContain('cannot read manifest')
  })

  it('rejects malformed YAML', async () => {
    const r = await route(
      ['publish'],
      fakeIo({ '/work/agentskit-os.plugin.yaml': '{not valid::: yaml}}}' }),
    )
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('parse manifest')
  })

  it('rejects unsigned manifest by default', async () => {
    const r = await route(
      ['publish'],
      fakeIo({ '/work/agentskit-os.plugin.yaml': unsignedManifestYaml }),
    )
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('unsigned')
  })

  it('accepts unsigned with --unsigned flag', async () => {
    const io = fakeIo({ '/work/agentskit-os.plugin.yaml': unsignedManifestYaml })
    const r = await route(['publish', '--unsigned'], io)
    expect(r.code).toBe(0)
    expect(io.fs.files.has('/work/agentskit-os.bundle.json')).toBe(true)
    expect(r.stdout).toContain('--unsigned')
  })

  it('builds bundle from signed manifest with no assets', async () => {
    const io = fakeIo({ '/work/agentskit-os.plugin.yaml': signedManifestYaml })
    const r = await route(['publish'], io)
    expect(r.code).toBe(0)
    const json = JSON.parse(io.fs.files.get('/work/agentskit-os.bundle.json')!)
    expect(json.manifest.id).toBe('web-search')
    expect(json.assets).toEqual([])
    expect(json.bundleIntegrity).toMatch(/^sha512:/)
  })

  it('hashes assets from dist/', async () => {
    const io = fakeIo(
      { '/work/agentskit-os.plugin.yaml': signedManifestYaml },
      {
        '/work/dist/index.js': new TextEncoder().encode('console.log(1)'),
        '/work/dist/util.js': new TextEncoder().encode('console.log(2)'),
      },
    )
    const r = await route(['publish'], io)
    expect(r.code).toBe(0)
    const json = JSON.parse(io.fs.files.get('/work/agentskit-os.bundle.json')!)
    expect(json.assets).toHaveLength(2)
    expect(json.assets.every((a: { integrity: string }) => /^sha256:/.test(a.integrity))).toBe(true)
  })

  it('honors --manifest, --assets, --out overrides', async () => {
    const io = fakeIo(
      { '/work/custom.yaml': signedManifestYaml },
      { '/work/build/x.js': new TextEncoder().encode('x') },
    )
    const r = await route(
      ['publish', '--manifest', 'custom.yaml', '--assets', 'build', '--out', 'out.json'],
      io,
    )
    expect(r.code).toBe(0)
    expect(io.fs.files.has('/work/out.json')).toBe(true)
    const json = JSON.parse(io.fs.files.get('/work/out.json')!)
    expect(json.assets).toHaveLength(1)
  })

  it('reports plugin id@version + signature in summary', async () => {
    const io = fakeIo({ '/work/agentskit-os.plugin.yaml': signedManifestYaml })
    const r = await route(['publish'], io)
    expect(r.stdout).toContain('web-search@1.0.0')
    expect(r.stdout).toContain('ed25519')
  })
})
