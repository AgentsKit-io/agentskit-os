import { resolve, dirname, join } from 'node:path'
import { stringify as yamlStringify } from 'yaml'
import { safeParseConfigRoot } from '@agentskit/os-core/schema/config-root'
import {
  LOCKFILE_VERSION,
  canonicalJson,
  detectLockDrift,
  parseLockfile,
  sha256OfCanonical,
  type Lockfile,
} from '@agentskit/os-core/lockfile/lock'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'
import { loadConfigFile } from '../loader.js'
import { CLI_VERSION } from './version.js'

const help = `agentskit-os lock <config-path> [--check] [--out <path>]

Generate or refresh agentskit-os.lock for a workspace.

Flags:
  --check       compare existing lockfile against current config; non-zero exit on drift
  --out <path>  write to a custom path (default: <config-dir>/agentskit-os.lock)

Exit codes:
  0  written | check passed | no drift
  1  invalid config | parse error
  2  usage error
  3  read error
  5  drift detected (--check mode)
`

type Args = {
  configPath?: string
  check: boolean
  out?: string
  usage?: string
}

const parseArgs = (argv: readonly string[]): Args => {
  const out: Args = { check: false }
  let i = 0
  while (i < argv.length) {
    const a = argv[i]
    if (a === '--help' || a === '-h') return { ...out, usage: 'help' }
    if (a === '--check') {
      out.check = true
      i++
      continue
    }
    if (a === '--out') {
      const v = argv[i + 1]
      if (!v || v.startsWith('--')) return { ...out, usage: '--out requires a path' }
      out.out = v
      i += 2
      continue
    }
    if (a?.startsWith('--')) return { ...out, usage: `unknown flag "${a}"` }
    if (out.configPath !== undefined) return { ...out, usage: 'only one positional <config-path> allowed' }
    if (a !== undefined) out.configPath = a
    i++
  }
  return out
}

const buildLockfile = async (
  configPath: string,
  config: ReturnType<typeof safeParseConfigRoot>,
): Promise<Lockfile> => {
  if (!config.success) throw new Error('config not parsed')
  const c = config.data
  const configHash = await sha256OfCanonical(c)

  const plugins = await Promise.all(
    c.plugins.map(async (p) => ({
      id: p.id,
      version: p.version,
      source: p.source,
      integrity: 'sha512:' + (await sha256SecondHalf(p.id + p.version)),
      resolvedAt: new Date().toISOString(),
      contributes: [...p.contributes],
      permissions: p.permissions.map((perm) => `${perm.resource}:${perm.actions.join(',')}`),
    })),
  )

  const agents = await Promise.all(
    c.agents.map(async (a) => ({
      id: a.id,
      version: '0.1.0',
      contentHash: await sha256OfCanonical(a),
      model: {
        provider: a.model.provider,
        name: a.model.model,
        pinnedVersion: 'unpinned',
        ...(a.model.temperature !== undefined ||
        a.model.maxTokens !== undefined ||
        a.model.topP !== undefined
          ? {
              params: {
                ...(a.model.temperature !== undefined ? { temperature: a.model.temperature } : {}),
                ...(a.model.maxTokens !== undefined ? { maxTokens: a.model.maxTokens } : {}),
                ...(a.model.topP !== undefined ? { topP: a.model.topP } : {}),
              },
            }
          : {}),
      },
    })),
  )

  const flows = await Promise.all(
    c.flows.map(async (f) => ({
      id: f.id,
      version: '0.1.0',
      contentHash: await sha256OfCanonical(f),
      nodes: f.nodes.map((n) => ({
        id: n.id,
        kind: n.kind,
        ...(n.kind === 'tool' ? { toolRef: n.tool, toolVersion: '0.0.0' } : {}),
        ...(n.kind === 'agent' ? { agentRef: `${n.agent}@0.1.0` } : {}),
      })),
    })),
  )

  const providers = [
    ...new Set(c.agents.map((a) => a.model.provider)),
  ].map((id) => ({ id, apiVersion: 'unknown' }))

  return parseLockfile({
    lockfileVersion: LOCKFILE_VERSION,
    generatedAt: new Date().toISOString(),
    generatedBy: `agentskit-os/${CLI_VERSION}`,
    workspace: { id: c.workspace.id, configHash, configPath },
    plugins,
    agents,
    flows,
    providers,
    tools: [],
    templates: [],
    schemas: { osCore: '0.0.0', workspaceConfig: 1 },
    tags: [],
  })
}

// Helper: sha512-shaped marker derived from sha256 of input.
// Real implementation in os-runtime will compute integrity over plugin tarball bytes.
const sha256SecondHalf = async (s: string): Promise<string> => {
  const h = await sha256OfCanonical(s)
  const hex = h.replace(/^sha256:/, '')
  return (hex + hex).slice(0, 128)
}

export const lock: CliCommand = {
  name: 'lock',
  summary: 'Generate or verify agentskit-os.lock from config',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const args = parseArgs(argv)
    if (args.usage === 'help') return { code: 2, stdout: '', stderr: help }
    if (args.usage) return { code: 2, stdout: '', stderr: `error: ${args.usage}\n\n${help}` }
    if (!args.configPath) return { code: 2, stdout: '', stderr: help }

    const loaded = await loadConfigFile(io, args.configPath)
    if (!loaded.ok) return { code: loaded.code, stdout: '', stderr: loaded.message }

    const parsed = safeParseConfigRoot(loaded.value)
    if (!parsed.success) {
      const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      return {
        code: 1,
        stdout: '',
        stderr: `error: invalid config:\n${lines.join('\n')}\n`,
      }
    }

    const next = await buildLockfile(loaded.absolutePath, parsed)

    const outPath = resolve(io.cwd(), args.out ?? join(dirname(loaded.absolutePath), 'agentskit-os.lock'))

    if (args.check) {
      const exists = await io.exists(outPath)
      if (!exists) {
        return {
          code: 5,
          stdout: '',
          stderr: `error: lockfile missing at ${outPath} (run \`agentskit-os lock\` to generate)\n`,
        }
      }
      const raw = await io.readFile(outPath)
      let prev: Lockfile
      try {
        const parsedYaml = (await import('yaml')).parse(raw)
        prev = parseLockfile(parsedYaml)
      } catch (err) {
        return {
          code: 1,
          stdout: '',
          stderr: `error: cannot parse existing lockfile: ${(err as Error).message}\n`,
        }
      }

      const installed = parsed.data.plugins.map((p) => ({ id: p.id, version: p.version }))
      const drift = detectLockDrift({
        lock: prev,
        currentConfigHash: next.workspace.configHash,
        installedPlugins: installed,
      })
      if (drift.length === 0) {
        return { code: 0, stdout: `ok: ${outPath} matches current config\n`, stderr: '' }
      }
      const lines = drift.map((d) => `  - ${d.code}${'id' in d ? `: ${d.id}` : ''}`)
      return {
        code: 5,
        stdout: '',
        stderr: `error: lockfile drift (${drift.length} issue${drift.length === 1 ? '' : 's'}):\n${lines.join('\n')}\n`,
      }
    }

    const yaml = `# AgentsKitOS lockfile (RFC-0002)\n# Generated by agentskit-os/${CLI_VERSION} — do not edit by hand.\n\n${yamlStringify(JSON.parse(canonicalJson(next)))}`
    await io.mkdir(dirname(outPath))
    await io.writeFile(outPath, yaml)

    return {
      code: 0,
      stdout: `wrote ${outPath} (workspace=${next.workspace.id}, plugins=${next.plugins.length}, agents=${next.agents.length}, flows=${next.flows.length})\n`,
      stderr: '',
    }
  },
}
