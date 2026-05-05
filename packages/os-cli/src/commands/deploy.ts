import { resolve, join, basename, dirname } from 'node:path'
import { Command } from 'commander'
import {
  InMemoryPublisher,
  verifyAsset,
  type AssetRecord,
  type Bundle,
  type Publisher,
  type PublishResult,
} from '@agentskit/os-marketplace-sdk'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'

const help = `agentskit-os deploy [<bundle>] [--assets <dir>] [--publisher <name>] [--dry-run]

Validates a bundle built by \`agentskit-os publish\` and (optionally) hands
it to a Publisher backend.

Default behavior:
  - Reads <bundle> (default: ./agentskit-os.bundle.json)
  - Re-reads sibling dist/ for asset bytes
  - Verifies each asset's SHA-256 against the bundle metadata
  - Hands (bundle, archive) to the configured Publisher

Flags:
  --assets <dir>     override assets directory (default: <bundle dir>/dist)
  --publisher <name> publisher backend (default: in-memory)
                     M1 supports: in-memory
                     M5: npm, github, http
  --dry-run          verify only; skip Publisher.publish call

Exit codes: 0 ok, 1 build error, 2 usage, 3 read error, 4 integrity error,
            5 publisher rejected.
`

type Args = {
  bundle: string
  assets?: string
  publisher: string
  dryRun: boolean
}

const SUPPORTED_PUBLISHERS = new Set(['in-memory'])

const buildArchive = (chunks: readonly Uint8Array[]): Uint8Array => {
  let total = 0
  for (const c of chunks) total += c.byteLength
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.byteLength
  }
  return out
}

const resolvePublisher = (name: string): Publisher | undefined => {
  if (name === 'in-memory') return new InMemoryPublisher()
  return undefined
}

const executeDeploy = async (args: Args, io: CliIo): Promise<CliExit> => {
  if (!SUPPORTED_PUBLISHERS.has(args.publisher)) {
    return {
      code: 2,
      stdout: '',
      stderr: `error: unsupported publisher "${args.publisher}". M1 supports: ${[...SUPPORTED_PUBLISHERS].join(', ')}\n`,
    }
  }

  const bundlePath = resolve(io.cwd(), args.bundle)
  const bundleDir = dirname(bundlePath)
  const assetsDir = args.assets ? resolve(io.cwd(), args.assets) : join(bundleDir, 'dist')

  let raw: string
  try {
    raw = await io.readFile(bundlePath)
  } catch (err) {
    return {
      code: 3,
      stdout: '',
      stderr: `error: cannot read bundle at ${bundlePath}: ${(err as Error).message}\n`,
    }
  }

  let bundle: Bundle
  try {
    bundle = JSON.parse(raw) as Bundle
  } catch (err) {
    return {
      code: 1,
      stdout: '',
      stderr: `error: cannot parse bundle: ${(err as Error).message}\n`,
    }
  }

  if (!bundle.manifest || !Array.isArray(bundle.assets) || !bundle.bundleIntegrity) {
    return {
      code: 1,
      stdout: '',
      stderr: `error: bundle missing required fields (manifest / assets / bundleIntegrity)\n`,
    }
  }

  if (!io.readBinary) {
    return {
      code: 1,
      stdout: '',
      stderr: `error: CliIo lacks readBinary support\n`,
    }
  }

  const chunks: Uint8Array[] = []
  const tampered: string[] = []
  const missing: string[] = []
  for (const a of bundle.assets as readonly AssetRecord[]) {
    const full = join(assetsDir, a.path)
    let bytes: Uint8Array
    try {
      bytes = await io.readBinary(full)
    } catch {
      missing.push(a.path)
      continue
    }
    if (bytes.byteLength !== a.size) {
      tampered.push(`${a.path}: size ${bytes.byteLength} ≠ expected ${a.size}`)
      continue
    }
    const ok = await verifyAsset(a.integrity, bytes)
    if (!ok) tampered.push(`${a.path}: SHA-256 mismatch`)
    chunks.push(bytes)
  }

  if (missing.length > 0 || tampered.length > 0) {
    const lines = [
      `error: bundle integrity check failed.`,
      ...missing.map((m) => `  missing asset: ${m}`),
      ...tampered.map((t) => `  tampered asset: ${t}`),
    ]
    return { code: 4, stdout: '', stderr: `${lines.join('\n')}\n` }
  }

  const summaryHeader = [
    `bundle: ${basename(bundlePath)}`,
    `plugin: ${bundle.manifest.id}@${bundle.manifest.version}`,
    `assets: ${bundle.assets.length} verified`,
    `publisher: ${args.publisher}`,
  ].join('\n')

  if (args.dryRun) {
    return {
      code: 0,
      stdout: `${summaryHeader}\nmode: dry-run (skipped publisher)\n`,
      stderr: '',
    }
  }

  const publisher = resolvePublisher(args.publisher)
  if (!publisher) {
    return {
      code: 2,
      stdout: '',
      stderr: `error: publisher "${args.publisher}" not wired in this build\n`,
    }
  }

  const archive = buildArchive(chunks)
  let result: PublishResult
  try {
    result = await publisher.publish(bundle, archive)
  } catch (err) {
    return {
      code: 1,
      stdout: '',
      stderr: `error: publisher threw: ${(err as Error).message}\n`,
    }
  }

  if (result.kind === 'rejected') {
    return {
      code: 5,
      stdout: '',
      stderr: `${summaryHeader}\nrejected: ${result.reason}\n`,
    }
  }

  return {
    code: 0,
    stdout: `${summaryHeader}\nresolvedAt: ${result.resolvedAt}\nsource: ${result.source}\n`,
    stderr: '',
  }
}

type DeployCliOpts = {
  assets?: string
  publisher?: string
  dryRun?: boolean
}

const buildProgram = (io: CliIo): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('deploy')
    .description(
      'agentskit-os deploy — Validate and ship a built plugin bundle to a Publisher backend.',
    )
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .argument('[bundle]', 'bundle JSON path', 'agentskit-os.bundle.json')
    .option('--assets <dir>', 'override assets directory')
    .option('--publisher <name>', 'publisher backend', 'in-memory')
    .option('--dry-run', 'verify only; skip publish', false)
    .action(async (bundle: string, opts: DeployCliOpts) => {
      const args: Args = {
        bundle,
        publisher: opts.publisher ?? 'in-memory',
        dryRun: opts.dryRun === true,
        ...(opts.assets !== undefined ? { assets: opts.assets } : {}),
      }
      result.current = await executeDeploy(args, io)
    })

  return { program, result }
}

export const deploy: CliCommand = {
  name: 'deploy',
  summary: 'Validate and ship a built plugin bundle to a Publisher backend',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const { program, result } = buildProgram(io)
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}

export const deployHelpText = (): string => help
