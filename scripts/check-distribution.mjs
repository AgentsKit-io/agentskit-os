#!/usr/bin/env node
// ADR-0014 enforcement: every packages/os-*/package.json must declare
// agentskitos.distribution = public | bundled-private | internal-only.
// bundled-private + internal-only must also be private:true.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('../packages', import.meta.url).pathname
const VALID = ['public', 'bundled-private', 'internal-only']

const violations = []

const dirs = readdirSync(ROOT).filter((n) => {
  try {
    return statSync(join(ROOT, n)).isDirectory()
  } catch {
    return false
  }
})

for (const dir of dirs) {
  const pkgPath = join(ROOT, dir, 'package.json')
  let pkg
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  } catch {
    continue
  }
  if (!pkg.name?.startsWith('@agentskit/os-')) continue

  const dist = pkg.agentskitos?.distribution
  if (!dist) {
    violations.push(`${pkg.name}: missing agentskitos.distribution (must be ${VALID.join(' | ')})`)
    continue
  }
  if (!VALID.includes(dist)) {
    violations.push(`${pkg.name}: agentskitos.distribution="${dist}" is not one of ${VALID.join(' | ')}`)
    continue
  }
  if ((dist === 'bundled-private' || dist === 'internal-only') && pkg.private !== true) {
    violations.push(
      `${pkg.name}: distribution="${dist}" requires "private": true in package.json`,
    )
  }
  if (dist === 'public' && pkg.private === true) {
    violations.push(`${pkg.name}: distribution="public" cannot be "private": true`)
  }
  if (dist === 'public' && pkg.publishConfig?.access !== 'public') {
    violations.push(`${pkg.name}: distribution="public" requires "publishConfig.access": "public"`)
  }
}

if (violations.length > 0) {
  console.error('ADR-0014 violation:\n')
  for (const v of violations) console.error(`  - ${v}`)
  console.error('\nSee docs/adr/0014-publish-vs-bundle.md')
  process.exit(1)
}

console.log('ADR-0014 check passed: all packages declare valid distribution tier.')
