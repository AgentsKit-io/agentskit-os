import { join } from 'node:path'

/** Default path for guided credential storage (gitignored via `.agentskitos/`). */
export const localCredentialsFilePath = (projectDir: string): string =>
  join(projectDir, '.agentskitos', 'vault', 'local.env')

export const parseLocalCredentialLines = (content: string): Map<string, string> => {
  const m = new Map<string, string>()
  for (const line of content.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq <= 0) continue
    const key = t.slice(0, eq).trim()
    const val = t.slice(eq + 1).trim()
    if (key) m.set(key, val)
  }
  return m
}

export const serializeLocalCredentialLines = (entries: Map<string, string>): string =>
  [...entries.entries()].map(([k, v]) => `${k}=${v}`).join('\n') + (entries.size > 0 ? '\n' : '')

export const isCredentialEnvKey = (key: string): boolean => /^[A-Z][A-Z0-9_]*$/.test(key)
