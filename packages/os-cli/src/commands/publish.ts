import { resolve, join, basename } from 'node:path'
import { Command } from 'commander'
import { parse as parseYaml, stringify as yamlStringify } from 'yaml'
import {
  buildBundle,
  buildManifest,
  type AssetEntry,
  type Bundle,
} from '@agentskit/os-marketplace-sdk'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'

const help = `agentskit-os publish [<dir>] [--manifest <path>] [--assets <dir>] [--out <path>] [--unsigned]

Builds a marketplace bundle from a plugin source directory.

Default behavior:
  - Reads <dir>/agentskit-os.plugin.yaml as manifest
  - Reads <dir>/dist/ as flat asset directory (1 level)
  - Writes <dir>/agentskit-os.bundle.json with manifest + per-asset
    integrity + bundle SHA-512

Flags:
  --manifest <path>   override manifest path
  --assets <dir>      override assets directory
  --out <path>        override bundle metadata output
  --unsigned          emit unsigned manifest (default: error if signature absent
                      and SDK signer not configured here in M1)

Real upload to npm / GitHub / marketplace HTTP lands in M5 via
\`os-marketplace-sdk\` Publisher backends.

Exit codes: 0 ok, 1 build error, 2 usage, 3 read error.
`

type Args = {
  dir: string
  manifest?: string
  assets?: string
  out?: string
  unsigned: boolean
}

const collectAssets = async (
  io: CliIo,
  assetsDir: string,
): Promise<readonly AssetEntry[]> => {
  if (!io.readdir || !io.readBinary) {
    throw new Error('CliIo lacks readdir/readBinary support — use defaultIo or extend fake')
  }
  if (!(await io.exists(assetsDir))) return []
  const entries = await io.readdir(assetsDir)
  const out: AssetEntry[] = []
  for (const name of entries) {
    const full = join(assetsDir, name)
    try {
      const bytes = await io.readBinary(full)
      out.push({ path: name, bytes })
    } catch {
      // skip directories or unreadable entries
    }
  }
  return out
}

const executePublish = async (args: Args, io: CliIo): Promise<CliExit> => {
  const baseDir = resolve(io.cwd(), args.dir)
  const manifestPathResolved = args.manifest
    ? resolve(io.cwd(), args.manifest)
    : join(baseDir, 'agentskit-os.plugin.yaml')
  const assetsDir = args.assets
    ? resolve(io.cwd(), args.assets)
    : join(baseDir, 'dist')
  const outPath = args.out
    ? resolve(io.cwd(), args.out)
    : join(baseDir, 'agentskit-os.bundle.json')

  let raw: string
  try {
    raw = await io.readFile(manifestPathResolved)
  } catch (err) {
    return {
      code: 3,
      stdout: '',
      stderr: `error: cannot read manifest at ${manifestPathResolved}: ${(err as Error).message}\n`,
    }
  }

  let manifestObject: unknown
  try {
    const trimmed = raw.trimStart()
    manifestObject =
      trimmed.startsWith('{') || trimmed.startsWith('[') ? JSON.parse(raw) : parseYaml(raw)
  } catch (err) {
    return {
      code: 1,
      stdout: '',
      stderr: `error: cannot parse manifest: ${(err as Error).message}\n`,
    }
  }

  let bundle: Bundle
  try {
    const manifest = await buildManifest(manifestObject)
    if (!manifest.signature && !args.unsigned) {
      return {
        code: 1,
        stdout: '',
        stderr: `error: manifest is unsigned. Sign it before publish or pass --unsigned for dev/internal bundles.\n`,
      }
    }
    const assets = await collectAssets(io, assetsDir)
    bundle = await buildBundle(manifest, assets)
  } catch (err) {
    return {
      code: 1,
      stdout: '',
      stderr: `error: build failed: ${(err as Error).message}\n`,
    }
  }

  const json = JSON.stringify(bundle, null, 2)
  await io.mkdir(baseDir)
  await io.writeFile(outPath, json)

  const summary = [
    `bundle: ${basename(outPath)}`,
    `plugin: ${bundle.manifest.id}@${bundle.manifest.version}`,
    `assets: ${bundle.assets.length}`,
    `bundleIntegrity: ${bundle.bundleIntegrity}`,
    args.unsigned ? `signature: NONE (--unsigned)` : `signature: ${bundle.manifest.signature?.algorithm}`,
    ``,
    `Wrote ${outPath}.`,
    `Real upload via marketplace HTTP / npm / GitHub publishers lands in M5.`,
  ].join('\n')

  return { code: 0, stdout: `${summary}\n`, stderr: '' }
}

type PublishCliOpts = {
  manifest?: string
  assets?: string
  out?: string
  unsigned?: boolean
}

const buildProgram = (io: CliIo): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('publish')
    .description(
      'agentskit-os publish — Build a plugin bundle (manifest + assets + integrity) for marketplace upload.',
    )
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .argument('[dir]', 'plugin source directory', '.')
    .option('--manifest <path>', 'override manifest path')
    .option('--assets <dir>', 'override assets directory')
    .option('--out <path>', 'override bundle metadata output')
    .option('--unsigned', 'emit unsigned manifest', false)
    .action(async (dir: string, opts: PublishCliOpts) => {
      const args: Args = {
        dir,
        unsigned: opts.unsigned === true,
        ...(opts.manifest !== undefined ? { manifest: opts.manifest } : {}),
        ...(opts.assets !== undefined ? { assets: opts.assets } : {}),
        ...(opts.out !== undefined ? { out: opts.out } : {}),
      }
      result.current = await executePublish(args, io)
    })

  return { program, result }
}

export const publish: CliCommand = {
  name: 'publish',
  summary: 'Build a plugin bundle (manifest + assets + integrity) for marketplace upload',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const { program, result } = buildProgram(io)
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}

export const publishHelpText = (): string => help
