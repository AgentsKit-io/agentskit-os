#!/usr/bin/env node
// ADR-0004 enforcement: zod must be a peerDependency of any @agentskit/os-* package
// that ships schemas. It must NOT be in `dependencies` (would bloat bundle + risk multi-version).
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('../packages', import.meta.url).pathname
const violations = []

const pkgDirs = readdirSync(ROOT).filter((name) => {
  const path = join(ROOT, name)
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
})

for (const dir of pkgDirs) {
  const pkgPath = join(ROOT, dir, 'package.json')
  let pkg
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  } catch {
    continue
  }
  if (!pkg.name?.startsWith('@agentskit/os-')) continue

  const deps = pkg.dependencies ?? {}
  if ('zod' in deps) {
    violations.push(`${pkg.name}: \`zod\` is in \`dependencies\` — must be \`peerDependencies\` per ADR-0004.`)
  }
}

if (violations.length > 0) {
  console.error('ADR-0004 violation:\n')
  for (const v of violations) console.error(`  - ${v}`)
  console.error('\nSee docs/adr/0004-zod-as-peer-dep.md')
  process.exit(1)
}

console.log('ADR-0004 check passed: zod is not improperly listed in dependencies.')
