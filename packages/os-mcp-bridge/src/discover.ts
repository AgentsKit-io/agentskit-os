import { constants as fsConstants } from 'node:fs'
import { access, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

export type McpTransport = 'stdio' | 'sse' | 'http' | 'unknown'

export type McpServerDefinition = {
  readonly name: string
  readonly transport: McpTransport
  /** Executable for stdio transports; may be empty for remote transports depending on source config. */
  readonly command: string
  readonly args: readonly string[]
  readonly env: Readonly<Record<string, string>>
  /** Where this definition was discovered. */
  readonly sourcePath: string
}

type UnknownRecord = Record<string, unknown>
const isRecord = (v: unknown): v is UnknownRecord => !!v && typeof v === 'object'

const asStr = (v: unknown): string | undefined => typeof v === 'string' ? v : undefined
const asStrRecord = (v: unknown): Record<string, string> | undefined => {
  if (!isRecord(v)) return undefined
  const out: Record<string, string> = {}
  for (const [k, val] of Object.entries(v)) {
    if (typeof val === 'string') out[k] = val
  }
  return out
}

const stableKey = (s: McpServerDefinition): string =>
  [
    s.transport,
    s.command,
    s.args.join('\u0001'),
    s.sourcePath,
    JSON.stringify(Object.keys(s.env).sort().reduce<Record<string, string>>((acc, k) => {
      acc[k] = s.env[k] ?? ''
      return acc
    }, {})),
  ].join('\u0002')

const readJsonFile = async (path: string): Promise<unknown | null> => {
  try {
    const raw = await readFile(path, 'utf8')
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

const inferTransport = (cmd: string, url: string | undefined): McpTransport => {
  if (url) return url.startsWith('http') ? 'http' : 'sse'
  if (!cmd) return 'unknown'
  return 'stdio'
}

const normalizeServer = (opts: {
  readonly name: string
  readonly sourcePath: string
  readonly raw: UnknownRecord
}): McpServerDefinition | null => {
  const command =
    asStr(opts.raw.command)
    ?? asStr(opts.raw.cmd)
    ?? ''

  const url = asStr(opts.raw.url) ?? asStr(opts.raw.uri)
  const args =
    Array.isArray(opts.raw.args) ? opts.raw.args.filter((a): a is string => typeof a === 'string') : []

  const env = asStrRecord(opts.raw.env) ?? {}

  const transportRaw = asStr(opts.raw.transport)?.toLowerCase()
  const transport: McpTransport =
    transportRaw === 'sse' ? 'sse'
      : transportRaw === 'http' || transportRaw === 'streamable-http' ? 'http'
        : inferTransport(command, url)

  // Remote transports sometimes omit command; require at least url or command.
  if (!command && !url) return null

  const mergedArgs = url && !command ? [...args] : [...args]

  return {
    name: opts.name,
    transport,
    command: command || url || '',
    args: mergedArgs,
    env,
    sourcePath: opts.sourcePath,
  }
}

export const extractMcpServersFromJson = (input: unknown, sourcePath: string): McpServerDefinition[] => {
  if (!isRecord(input)) return []

  const serversRaw =
    input.mcpServers
    ?? input.mcp_servers
    ?? input.servers

  if (!isRecord(serversRaw)) return []

  const out: McpServerDefinition[] = []
  for (const [name, spec] of Object.entries(serversRaw)) {
    if (!isRecord(spec)) continue
    const norm = normalizeServer({ name, sourcePath, raw: spec })
    if (norm) out.push(norm)
  }
  return out
}

export type McpDiscoveryOptions = {
  /** Defaults to `os.homedir()`. */
  readonly homeDir?: string
  /** When false, only scans `extraConfigPaths` (defaults to true). */
  readonly includeDefaultPaths?: boolean
  /** Additional explicit files to try (absolute paths). */
  readonly extraConfigPaths?: readonly string[]
}

const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path, fsConstants.R_OK)
    return true
  } catch {
    return false
  }
}

export const defaultMcpDiscoveryPaths = (opts: McpDiscoveryOptions = {}): string[] => {
  const home = opts.homeDir ?? homedir()
  const bases = [
    join(home, '.cursor'),
    join(home, '.codex'),
    join(home, '.config', 'claude'),
  ]

  const files: string[] = []
  for (const b of bases) {
    files.push(join(b, 'mcp.json'))
  }

  if (opts.extraConfigPaths?.length) files.push(...opts.extraConfigPaths)
  return files
}

export const discoverMcpServers = async (opts: McpDiscoveryOptions = {}): Promise<readonly McpServerDefinition[]> => {
  const paths =
    opts.includeDefaultPaths === false
      ? [...(opts.extraConfigPaths ?? [])]
      : defaultMcpDiscoveryPaths(opts)
  const merged: McpServerDefinition[] = []

  for (const p of paths) {
    if (!(await exists(p))) continue
    const json = await readJsonFile(p)
    if (!json) continue
    merged.push(...extractMcpServersFromJson(json, p))
  }

  const dedup = new Map<string, McpServerDefinition>()
  for (const s of merged) {
    const k = stableKey(s)
    if (!dedup.has(k)) dedup.set(k, s)
  }
  return [...dedup.values()]
}
