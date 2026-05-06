import { readFileSync } from 'node:fs'

/**
 * Parse a local `.env`-style secrets file (KEY=value, `#` comments).
 * Semantics align with `agentskit-os creds` / `.agentskitos/vault/local.env` (#375);
 * implementation is intentionally distinct from `os-cli` to keep this package CLI-free.
 */
export const parseSecretsEnvFileLines = (content: string): Map<string, string> => {
  const m = new Map<string, string>()
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trimStart()
    if (line.length === 0 || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 1) continue
    const key = line.slice(0, eq).trimEnd()
    const val = line.slice(eq + 1).trim()
    if (key.length > 0) m.set(key, val)
  }
  return m
}

const vaultFileCache = new Map<string, Readonly<Record<string, string>>>()

/** Load and cache KEY=value pairs from an on-disk vault file for subprocess env. */
export const loadSecretsEnvFromFile = (filePath: string): Readonly<Record<string, string>> => {
  const hit = vaultFileCache.get(filePath)
  if (hit !== undefined) return hit
  const raw = readFileSync(filePath, 'utf8')
  const map = parseSecretsEnvFileLines(raw)
  const obj = Object.fromEntries(map) as Readonly<Record<string, string>>
  vaultFileCache.set(filePath, obj)
  return obj
}
