#!/usr/bin/env node
// ADR-0002 enforcement: AgentsKit primitives must be peerDependencies, not dependencies.
// AgentsKitOS imports AgentsKit, never duplicates it.
// AgentsKit packages (e.g. @agentskit/core, @agentskit/runtime, @agentskit/adapters, ...) listed in
// `dependencies` of any @agentskit/os-* package will fail the build.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('../packages', import.meta.url).pathname

const AGENTSKIT_PACKAGES = [
  '@agentskit/core',
  '@agentskit/adapters',
  '@agentskit/runtime',
  '@agentskit/memory',
  '@agentskit/tools',
  '@agentskit/skills',
  '@agentskit/observability',
  '@agentskit/eval',
  '@agentskit/rag',
  '@agentskit/sandbox',
  '@agentskit/react',
  '@agentskit/ink',
  '@agentskit/cli',
]

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
  for (const ak of AGENTSKIT_PACKAGES) {
    if (ak in deps) {
      violations.push(`${pkg.name}: \`${ak}\` is in \`dependencies\` — must be \`peerDependencies\` per ADR-0002.`)
    }
  }
}

if (violations.length > 0) {
  console.error('ADR-0002 violation:\n')
  for (const v of violations) console.error(`  - ${v}`)
  console.error('\nSee docs/adr/0002-depend-on-agentskit.md')
  process.exit(1)
}

console.log('ADR-0002 check passed: no AgentsKit primitives improperly listed in dependencies.')
