#!/usr/bin/env node
/**
 * Opt-in CI gate (#374 / threat-model §7): when `CODING_AGENT_CONFORMANCE_PROVIDERS`
 * is a comma-separated list of built-in provider ids, runs
 * `coding-agent conformance --provider <id> [--skip-if-unavailable] [--secrets-file …]`
 * for each id and fails if any **available** provider is not certified.
 *
 * When the env var is unset or empty, exits 0 immediately (default on ubuntu-latest).
 *
 * Optional: `CODING_AGENT_CONFORMANCE_SECRETS_FILE` — path passed as `--secrets-file` (#375).
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const cli = join(ROOT, 'packages/os-cli/bin/agentskit-os.js')

const raw = process.env.CODING_AGENT_CONFORMANCE_PROVIDERS ?? ''
const ids = raw
  .split(',')
  .map((s) => s.trim())
  .filter((s) => s.length > 0)

if (ids.length === 0) {
  console.log(
    'Conformance gate: skip (set repo Actions variable CODING_AGENT_CONFORMANCE_PROVIDERS=codex,... to certify installed CLIs on CI).',
  )
  process.exit(0)
}

const secrets = process.env.CODING_AGENT_CONFORMANCE_SECRETS_FILE?.trim()

for (const id of ids) {
  const args = [cli, 'coding-agent', 'conformance', '--provider', id, '--skip-if-unavailable', '--json']
  if (secrets !== undefined && secrets.length > 0) {
    args.push('--secrets-file', secrets)
  }
  const r = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env,
  })
  if (r.status === 0) {
    const out = `${r.stdout}${r.stderr}`.trim()
    if (out.includes('"skipped"') && out.includes('true')) {
      console.log(`Conformance gate: ${id} — skipped (CLI not available).`)
      continue
    }
    console.log(`Conformance gate: ${id} — certified.`)
    continue
  }
  if (r.status === 2) {
    console.error(`Conformance gate: invalid provider or args for "${id}".`)
    process.exit(2)
  }
  console.error(`Conformance gate: provider "${id}" is installed but not certified.`)
  console.error(`${r.stdout}${r.stderr}`)
  process.exit(1)
}

console.log('Conformance gate: all listed providers passed (certified or skipped).')
process.exit(0)
