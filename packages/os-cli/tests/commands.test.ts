import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as mcpBridge from '@agentskit/os-mcp-bridge'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { route } from '../src/router.js'
import { fakeIo } from './_fake-io.js'

describe('config explain', () => {
  it('shows help when no layers provided', async () => {
    const r = await route(['config', 'explain'])
    expect(r.code).toBe(2)
    expect(`${r.stdout}${r.stderr}`).toMatch(/agentskit-os config explain|specify at least one layer/i)
  })

  it('rejects unknown layer flag', async () => {
    const r = await route(['config', 'explain', '--cosmic', 'x.yaml'])
    expect(r.code).toBe(2)
    expect(`${r.stdout}${r.stderr}`).toMatch(/unknown option|cosmic/i)
  })

  it('rejects layer flag without value', async () => {
    const r = await route(['config', 'explain', '--workspace'])
    expect(r.code).toBe(2)
    expect(`${r.stdout}${r.stderr}`).toMatch(/required option argument|missing|workspace/i)
  })

  it('reports highest-priority layer per leaf', async () => {
    const io = fakeIo({
      '/work/d.yaml': 'a: 1\nb: 1\nonly_in_defaults: 7\n',
      '/work/w.yaml': 'b: 2\nc: 3\n',
      '/work/r.yaml': 'a: 99\n',
    })
    const r = await route(
      ['config', 'explain', '--defaults', 'd.yaml', '--workspace', 'w.yaml', '--runtime', 'r.yaml'],
      io,
    )
    expect(r.code).toBe(0)
    expect(r.stdout).toMatch(/a\s+← runtime/)
    expect(r.stdout).toMatch(/b\s+← workspace/)
    expect(r.stdout).toMatch(/c\s+← workspace/)
    expect(r.stdout).toMatch(/only_in_defaults\s+← defaults/)
  })

  it('propagates read error', async () => {
    const r = await route(['config', 'explain', '--defaults', 'missing.yaml'], fakeIo({}))
    expect(r.code).toBe(3)
  })

  it('propagates parse error', async () => {
    const r = await route(
      ['config', 'explain', '--defaults', 'd.yaml'],
      fakeIo({ '/work/d.yaml': '{bad:::' }),
    )
    expect(r.code).toBe(1)
  })
})

describe('config diff', () => {
  it('shows help when args missing', async () => {
    const r = await route(['config', 'diff'])
    expect(r.code).toBe(2)
    expect(`${r.stdout}${r.stderr}`).toContain('agentskit-os config diff')
  })

  it('reports no changes when identical', async () => {
    const io = fakeIo({ '/work/a.yaml': 'x: 1\n', '/work/b.yaml': 'x: 1\n' })
    const r = await route(['config', 'diff', 'a.yaml', 'b.yaml'], io)
    expect(r.code).toBe(0)
    expect(r.stdout).toBe('no changes\n')
  })

  it('reports add / remove / replace', async () => {
    const io = fakeIo({
      '/work/a.yaml': 'kept: 1\nremoved: 2\nchanged: 3\n',
      '/work/b.yaml': 'kept: 1\nchanged: 4\nadded: 5\n',
    })
    const r = await route(['config', 'diff', 'a.yaml', 'b.yaml'], io)
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('+ added: 5')
    expect(r.stdout).toContain('- removed: 2')
    expect(r.stdout).toContain('~ changed: 3 → 4')
  })

  it('propagates read error on first file', async () => {
    const r = await route(['config', 'diff', 'missing.yaml', 'x.yaml'], fakeIo({}))
    expect(r.code).toBe(3)
  })

  it('propagates read error on second file', async () => {
    const r = await route(
      ['config', 'diff', 'a.yaml', 'missing.yaml'],
      fakeIo({ '/work/a.yaml': 'x: 1\n' }),
    )
    expect(r.code).toBe(3)
  })
})

describe('config migrate', () => {
  it('shows help when no path', async () => {
    const r = await route(['config', 'migrate'])
    expect(r.code).toBe(2)
    expect(`${r.stdout}${r.stderr}`).toContain('agentskit-os config migrate')
  })

  it('rejects --to with non-integer', async () => {
    const r = await route(
      ['config', 'migrate', 'cfg.yaml', '--to', 'abc'],
      fakeIo({ '/work/cfg.yaml': 'schemaVersion: 1\n' }),
    )
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('non-negative integer')
  })

  it('returns ok with no migrations needed when versions match', async () => {
    const r = await route(
      ['config', 'migrate', 'cfg.yaml'],
      fakeIo({ '/work/cfg.yaml': 'schemaVersion: 1\n' }),
    )
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('no migrations needed')
  })

  it('reports MigrationError code', async () => {
    const r = await route(
      ['config', 'migrate', 'cfg.yaml', '--to', '0'],
      fakeIo({ '/work/cfg.yaml': 'schemaVersion: 1\n' }),
    )
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('config.future_version')
  })

  it('rejects unexpected positional', async () => {
    const r = await route(
      ['config', 'migrate', 'cfg.yaml', 'extra'],
      fakeIo({ '/work/cfg.yaml': 'schemaVersion: 1\n' }),
    )
    expect(r.code).toBe(2)
    expect(`${r.stdout}${r.stderr}`).toMatch(/too many arguments|unexpected argument/i)
  })
})

describe('doctor', () => {
  it('runs and prints status table', async () => {
    const r = await route(['doctor'])
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('node')
    expect(r.stdout).toContain('platform')
    expect(r.stdout).toContain('@agentskit/os-core')
    expect(r.stdout).toContain('all checks passed')
  })

  it('shows help on --help', async () => {
    const r = await route(['doctor', '--help'])
    expect(r.code).toBe(2)
    expect(`${r.stdout}${r.stderr}`).toContain('agentskit-os doctor')
  })
})

describe('mcp discover', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('prints help', async () => {
    const r = await route(['mcp', 'discover', '--help'])
    expect(r.code).toBe(2)
    const out = `${r.stdout}${r.stderr}`
    expect(out).toContain('mcp discover')
  })

  it('discovers empty set without crashing when defaults are disabled', async () => {
    const spy = vi.spyOn(mcpBridge, 'discoverMcpServers').mockResolvedValueOnce([])
    const r = await route(['mcp', 'discover', '--no-defaults'])
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('no MCP servers discovered')
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ includeDefaultPaths: false, extraConfigPaths: [] }),
    )
  })
})

describe('trigger preset', () => {
  it('lists presets', async () => {
    const r = await route(['trigger', 'preset', 'list'])
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('webhook/inbound-generic')
    expect(r.stdout).toContain('webhook/discord-inbound')
  })

  it('shows a preset', async () => {
    const r = await route(['trigger', 'preset', 'show', 'cron/nightly-health'])
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('cron')
  })

  it('returns 1 for unknown preset id', async () => {
    const r = await route(['trigger', 'preset', 'show', 'nope/not-a-real-preset'])
    expect(r.code).toBe(1)
    expect(`${r.stdout}${r.stderr}`).toContain('unknown preset')
  })
})

describe('dev worktree', () => {
  it('prints help', async () => {
    const r = await route(['dev', 'worktree', '--help'])
    expect(r.code).toBe(2)
    const out = `${r.stdout}${r.stderr}`
    expect(out).toContain('dev worktree')
    expect(out).toMatch(/add|remove/)
  })
})

describe('dev issue-pr', () => {
  it('prints help', async () => {
    const r = await route(['dev', 'issue-pr', '--help'])
    expect(r.code).toBe(2)
    const out = `${r.stdout}${r.stderr}`
    expect(out).toContain('dev issue-pr')
    expect(out).toMatch(/--issue/)
  })

  it('prints JSON dry-run report', async () => {
    const r = await route([
      'dev',
      'issue-pr',
      '--issue',
      'https://github.com/org/repo/issues/1',
      '--repo',
      '/tmp/r',
      '--json',
    ])
    expect(r.code).toBe(0)
    const j = JSON.parse(r.stdout) as { templateId: string; dryRun: boolean }
    expect(j.dryRun).toBe(true)
    expect(j.templateId).toBe('dev-issue-to-pr')
  })

  it('writes --persist JSON file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ak-issue-pr-'))
    const outPath = join(dir, 'report.json')
    try {
      const r = await route([
        'dev',
        'issue-pr',
        '--issue',
        'org/repo#99',
        '--repo',
        '/repo',
        '--persist',
        outPath,
      ])
      expect(r.code).toBe(0)
      const disk = JSON.parse(readFileSync(outPath, 'utf8')) as { issueRef: string }
      expect(disk.issueRef).toBe('org/repo#99')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('coding-agent conformance', () => {
  it('prints help', async () => {
    const r = await route(['coding-agent', 'conformance', '--help'])
    expect(r.code).toBe(2)
    const out = `${r.stdout}${r.stderr}`
    expect(out).toContain('--provider')
  })

  it('rejects unknown provider', async () => {
    const r = await route(['coding-agent', 'conformance', '--provider', 'nope'])
    expect(r.code).toBe(2)
    expect(`${r.stdout}${r.stderr}`).toContain('unknown provider')
  })
})

describe('coding-agent delegate', () => {
  it('prints help', async () => {
    const r = await route(['coding-agent', 'delegate', '--help'])
    expect(r.code).toBe(2)
    const out = `${r.stdout}${r.stderr}`
    expect(out).toContain('--sub')
    expect(out).toContain('coordinator')
    expect(out).toContain('--parallel')
  })
})

describe('coding-agent benchmark', () => {
  it('prints help', async () => {
    const r = await route(['coding-agent', 'benchmark', '--help'])
    expect(r.code).toBe(2)
    const out = `${r.stdout}${r.stderr}`
    expect(out).toContain('--providers')
    expect(out).toContain('--prompt')
    expect(out).toContain('--persist')
    expect(out).toContain('--artifact-dir')
    expect(out).toContain('--capture-run-artifacts')
    expect(out).toContain('--artifact-trace-id')
  })

  it('rejects unknown provider id in csv', async () => {
    const r = await route([
      'coding-agent',
      'benchmark',
      '--providers',
      'codex,nope',
      '--prompt',
      'x',
    ])
    expect(r.code).toBe(2)
    expect(`${r.stdout}${r.stderr}`).toContain('unknown provider')
  })

  it('writes --persist JSON report', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ak-bench-'))
    const outPath = join(dir, 'bench.json')
    try {
      const r = await route(
        [
          'coding-agent',
          'benchmark',
          '--providers',
          'codex',
          '--prompt',
          'noop',
          '--timeout-ms',
          '100',
          '--persist',
          outPath,
        ],
        fakeIo({}),
      )
      expect([0, 1] as const).toContain(r.code)
      const disk = JSON.parse(readFileSync(outPath, 'utf8')) as { repoRoot: string; rows: unknown[] }
      expect(typeof disk.repoRoot).toBe('string')
      expect(Array.isArray(disk.rows)).toBe(true)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('writes --artifact-dir task report bundle', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ak-artifact-'))
    try {
      const r = await route(
        [
          'coding-agent',
          'benchmark',
          '--providers',
          'codex',
          '--prompt',
          'noop',
          '--timeout-ms',
          '100',
          '--artifact-dir',
          dir,
          '--trace-url',
          'https://trace.example/t1',
        ],
        fakeIo({}),
      )
      expect([0, 1] as const).toContain(r.code)
      expect(existsSync(join(dir, 'coding-task-report.json'))).toBe(true)
      expect(existsSync(join(dir, 'coding-task-report.md'))).toBe(true)
      expect(existsSync(join(dir, 'coding-task-dashboard.json'))).toBe(true)
      const disk = JSON.parse(readFileSync(join(dir, 'coding-task-report.json'), 'utf8')) as {
        links: { traceUrl?: string }
      }
      expect(disk.links.traceUrl).toBe('https://trace.example/t1')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('writes coding run artifact JSON when --capture-run-artifacts is set', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ak-run-art-'))
    try {
      const r = await route(
        [
          'coding-agent',
          'benchmark',
          '--providers',
          'codex',
          '--prompt',
          'noop',
          '--timeout-ms',
          '100',
          '--capture-run-artifacts',
          dir,
          '--artifact-trace-id',
          'trace-xyz',
        ],
        fakeIo({}),
      )
      expect([0, 1] as const).toContain(r.code)
      const files = readdirSync(dir).filter((f) => f.startsWith('coding-run-artifact-'))
      expect(files.length).toBeGreaterThanOrEqual(1)
      const disk = JSON.parse(readFileSync(join(dir, files[0]!), 'utf8')) as {
        ids: { traceId?: string }
        phase: string
      }
      expect(disk.ids.traceId).toBe('trace-xyz')
      expect(disk.phase).toBe('provider_completed')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('flow new', () => {
  const validRoot = `schemaVersion: 1
workspace:
  schemaVersion: 1
  id: team-a
  name: Team A
vault:
  backend: os-keychain
security: {}
observability: {}
`

  it('prints help', async () => {
    const r = await route(['flow', 'new', '--help'])
    expect(r.code).toBe(2)
    const out = `${r.stdout}${r.stderr}`
    expect(out).toContain('flow new')
    expect(out).toContain('--list')
  })

  it('lists templates including topology and dev packs', async () => {
    const r = await route(['flow', 'new', '--list'])
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('dev-pr-review')
    expect(r.stdout).toContain('compare-models')
  })

  it('rejects missing template id when not listing', async () => {
    const r = await route(['flow', 'new'], fakeIo({ '/work/agentskit-os.config.yaml': validRoot }))
    expect(r.code).toBe(2)
    expect(`${r.stdout}${r.stderr}`).toMatch(/template-id|browse|--list/i)
  })

  it('merges pr-review flow into config', async () => {
    const io = fakeIo({ '/work/agentskit-os.config.yaml': validRoot })
    const r = await route(['flow', 'new', 'pr-review'], io)
    expect(r.code).toBe(0)
    const written = await io.readFile('/work/agentskit-os.config.yaml')
    expect(written).toContain('pr-review-flow')
    expect(written).toContain('pr-reviewer')
  })

  it('returns 4 on flow id collision without --replace', async () => {
    const io = fakeIo({ '/work/agentskit-os.config.yaml': validRoot })
    const first = await route(['flow', 'new', 'pr-review'], io)
    expect(first.code).toBe(0)
    const second = await route(['flow', 'new', 'pr-review'], io)
    expect(second.code).toBe(4)
  })
})
