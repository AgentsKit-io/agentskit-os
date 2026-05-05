import { describe, expect, it } from 'vitest'
import { route } from '../src/router.js'
import { fakeIo } from './_fake-io.js'

describe('init-ci', () => {
  it('shows help with --help', async () => {
    const r = await route(['init-ci', '--help'])
    expect(r.code).toBe(2)
    expect(`${r.stdout}${r.stderr}`).toContain('agentskit-os init-ci')
  })

  it('lists templates with --list', async () => {
    const io = fakeIo()
    const r = await route(['init-ci', '--list'], io)
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('agentskit-ci.yml')
    expect(r.stdout).toContain('agentskit-evals.yml')
    expect(r.stdout).toContain('agentskit-deploy.yml')
  })

  it('installs all templates by default', async () => {
    const io = fakeIo()
    const r = await route(['init-ci'], io)
    expect(r.code).toBe(0)
    expect(io.fs.files.has('/work/.github/workflows/agentskit-ci.yml')).toBe(true)
    expect(io.fs.files.has('/work/.github/workflows/agentskit-evals.yml')).toBe(true)
    expect(io.fs.files.has('/work/.github/workflows/agentskit-deploy.yml')).toBe(true)
    expect(r.stdout).toContain('Installed 3 workflow template(s)')
  })

  it('installs only the templates the user picked', async () => {
    const io = fakeIo()
    const r = await route(['init-ci', '--ci'], io)
    expect(r.code).toBe(0)
    expect(io.fs.files.has('/work/.github/workflows/agentskit-ci.yml')).toBe(true)
    expect(io.fs.files.has('/work/.github/workflows/agentskit-evals.yml')).toBe(false)
    expect(io.fs.files.has('/work/.github/workflows/agentskit-deploy.yml')).toBe(false)
  })

  it('refuses to overwrite without --force', async () => {
    const io = fakeIo({
      '/work/.github/workflows/agentskit-ci.yml': '# existing\n',
    })
    const r = await route(['init-ci', '--ci'], io)
    expect(r.code).toBe(4)
    expect(r.stderr).toMatch(/refusing to overwrite/i)
    expect(io.fs.files.get('/work/.github/workflows/agentskit-ci.yml')).toBe('# existing\n')
  })

  it('overwrites existing files when --force is set', async () => {
    const io = fakeIo({
      '/work/.github/workflows/agentskit-ci.yml': '# existing\n',
    })
    const r = await route(['init-ci', '--ci', '--force'], io)
    expect(r.code).toBe(0)
    const written = io.fs.files.get('/work/.github/workflows/agentskit-ci.yml')!
    expect(written).toContain('agentskit-os config validate')
    expect(written).not.toBe('# existing\n')
  })

  it('mixes written and skipped when only some files clash', async () => {
    const io = fakeIo({
      '/work/.github/workflows/agentskit-ci.yml': '# existing\n',
    })
    const r = await route(['init-ci'], io)
    expect(r.code).toBe(0)
    expect(r.stdout).toMatch(/skipped .*agentskit-ci\.yml/)
    expect(r.stdout).toContain('Installed 2 workflow template(s)')
    expect(io.fs.files.has('/work/.github/workflows/agentskit-evals.yml')).toBe(true)
    expect(io.fs.files.has('/work/.github/workflows/agentskit-deploy.yml')).toBe(true)
  })
})
