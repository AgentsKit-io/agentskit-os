import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadSecretsEnvFromFile, parseSecretsEnvFileLines } from '../src/secrets-env-file.js'

describe('parseSecretsEnvFileLines', () => {
  it('parses KEY=value and ignores comments', () => {
    const m = parseSecretsEnvFileLines(`
# c
OPENAI_API_KEY=sk-test
EMPTY=

`)
    expect(m.get('OPENAI_API_KEY')).toBe('sk-test')
    expect(m.has('EMPTY')).toBe(true)
  })
})

describe('loadSecretsEnvFromFile', () => {
  it('loads from disk', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ak-vault-'))
    try {
      const p = join(dir, 's.env')
      writeFileSync(p, 'FOO=bar\n', 'utf8')
      expect(loadSecretsEnvFromFile(p).FOO).toBe('bar')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
