import { resolve, dirname, join } from 'node:path'
import { Command } from 'commander'
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
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'
import { loadConfigFile } from '../loader.js'
import { CLI_VERSION } from './version.js'

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

const buildProgram = (io: CliIo): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('lock')
    .description(
      'agentskit-os lock — Generate or verify agentskit-os.lock from a workspace config (RFC-0002).',
    )
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .argument('<configPath>', 'workspace config file path')
    .option('--check', 'compare existing lockfile against current config; exit non-zero on drift', false)
    .option('--out <path>', 'write lockfile to this path (default: <config-dir>/agentskit-os.lock)')
    .action(async (configPath: string, opts: { check?: boolean; out?: string }) => {
      const loaded = await loadConfigFile(io, configPath)
      if (!loaded.ok) {
        result.current = { code: loaded.code, stdout: '', stderr: loaded.message }
        return
      }

      const parsed = safeParseConfigRoot(loaded.value)
      if (!parsed.success) {
        const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`)
        result.current = {
          code: 1,
          stdout: '',
          stderr: `error: invalid config:\n${lines.join('\n')}\n`,
        }
        return
      }

      const next = await buildLockfile(loaded.absolutePath, parsed)

      let outName = join(dirname(loaded.absolutePath), 'agentskit-os.lock')
      if (opts.out) outName = opts.out
      const outPath = resolve(io.cwd(), outName)

      if (opts.check) {
        const exists = await io.exists(outPath)
        if (!exists) {
          result.current = {
            code: 5,
            stdout: '',
            stderr: `error: lockfile missing at ${outPath} (run \`agentskit-os lock\` to generate)\n`,
          }
          return
        }
        const raw = await io.readFile(outPath)
        let prev: Lockfile
        try {
          const parsedYaml = (await import('yaml')).parse(raw)
          prev = parseLockfile(parsedYaml)
        } catch (err) {
          result.current = {
            code: 1,
            stdout: '',
            stderr: `error: cannot parse existing lockfile: ${(err as Error).message}\n`,
          }
          return
        }

        const installed = parsed.data.plugins.map((p) => ({ id: p.id, version: p.version }))
        const drift = detectLockDrift({
          lock: prev,
          currentConfigHash: next.workspace.configHash,
          installedPlugins: installed,
        })
        if (drift.length === 0) {
          result.current = { code: 0, stdout: `ok: ${outPath} matches current config\n`, stderr: '' }
          return
        }
        const lines = drift.map((d) => `  - ${d.code}${'id' in d ? `: ${d.id}` : ''}`)
        result.current = {
          code: 5,
          stdout: '',
          stderr: `error: lockfile drift (${drift.length} issue${drift.length === 1 ? '' : 's'}):\n${lines.join('\n')}\n`,
        }
        return
      }

      const yaml = `# AgentsKitOS lockfile (RFC-0002)\n# Generated by agentskit-os/${CLI_VERSION} — do not edit by hand.\n\n${yamlStringify(JSON.parse(canonicalJson(next)))}`
      await io.mkdir(dirname(outPath))
      await io.writeFile(outPath, yaml)

      result.current = {
        code: 0,
        stdout: `wrote ${outPath} (workspace=${next.workspace.id}, plugins=${next.plugins.length}, agents=${next.agents.length}, flows=${next.flows.length})\n`,
        stderr: '',
      }
    })

  return { program, result }
}

export const lock: CliCommand = {
  name: 'lock',
  summary: 'Generate or verify agentskit-os.lock from config',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const { program, result } = buildProgram(io)
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    if (result.current) return result.current
    return { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
