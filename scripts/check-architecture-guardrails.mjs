#!/usr/bin/env node
// Agentic-development guardrails.
//
// This check is intentionally dependency-free so it can run in Husky, CI, and
// inside any external coding-agent CLI before the full toolchain is warm.
//
// Default mode fails only on *new* architecture debt compared with the committed
// baseline. Update mode rewrites the baseline after an intentional cleanup:
//   node scripts/check-architecture-guardrails.mjs --update-baseline

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { createHash } from 'node:crypto'

const ROOT = new URL('..', import.meta.url).pathname
const BASELINE_PATH = join(ROOT, '.agentskitos-quality-baseline.json')
const UPDATE = process.argv.includes('--update-baseline')

const SOURCE_ROOTS = [
  'apps/desktop/src',
  'apps/desktop/sidecar',
  'packages',
]
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const MAX_COMPLEXITY = 14
const DUPLICATE_WINDOW = 8

const EXCLUDED_PARTS = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  'target',
  '.turbo',
  'gen',
  '.agentskitos-api',
])

const hash = (input) => createHash('sha256').update(input).digest('hex').slice(0, 16)

const rel = (path) => relative(ROOT, path).replaceAll('\\', '/')

const extensionOf = (path) => {
  const match = path.match(/\.[^.]+$/)
  return match?.[0] ?? ''
}

const isTestFile = (path) =>
  /(^|\/)(__tests__|tests?)(\/|$)/.test(path) ||
  /\.(test|spec)\.[cm]?[jt]sx?$/.test(path)

const shouldSkipPath = (path) => path.split('/').some((part) => EXCLUDED_PARTS.has(part))

const walk = (dir, out = []) => {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    const pathRel = rel(path)
    if (shouldSkipPath(pathRel)) continue
    const stat = statSync(path)
    if (stat.isDirectory()) walk(path, out)
    else if (EXTENSIONS.has(extensionOf(path))) out.push(path)
  }
  return out
}

const sourceFiles = SOURCE_ROOTS.flatMap((root) => walk(join(ROOT, root)))
  .filter((path) => {
    const pathRel = rel(path)
    if (pathRel.startsWith('packages/')) return /\/src\//.test(pathRel)
    return true
  })
  .sort()

const readSource = (path) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n')

const stripLineComment = (line) => {
  let quote = null
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const prev = line[i - 1]
    if ((char === '"' || char === "'" || char === '`') && prev !== '\\') {
      quote = quote === char ? null : quote ?? char
    }
    if (!quote && char === '/' && line[i + 1] === '/') return line.slice(0, i)
  }
  return line
}

const stripStrings = (line) => {
  let out = ''
  let quote = null
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const prev = line[i - 1]
    if ((char === '"' || char === "'" || char === '`') && prev !== '\\') {
      quote = quote === char ? null : quote ?? char
      out += ' '
      continue
    }
    out += quote ? 'x' : char
  }
  return out
}

const compact = (line) => stripStrings(stripLineComment(line)).trim()

const addIssue = (issues, issue) => {
  issues.push({
    ...issue,
    id: `${issue.kind}:${issue.file}:${hash(issue.stableKey ?? issue.detail)}`,
  })
}

const detectPatternDebt = (path, raw, issues) => {
  const file = rel(path)
  const test = isTestFile(file)
  const lines = raw.split('\n')

  lines.forEach((line, idx) => {
    const lineNo = idx + 1
    const code = compact(line)

    if (!test && /\bsidecarRequest\s*<\s*unknown\s*>/.test(code)) {
      addIssue(issues, {
        kind: 'untyped-sidecar',
        file,
        line: lineNo,
        stableKey: code,
        detail: 'sidecarRequest<unknown> hides the IPC contract; define a typed DTO/schema.',
      })
    }

    if (!test && /\bMOCK_[A-Z0-9_]+\b/.test(code)) {
      addIssue(issues, {
        kind: 'mock-runtime-debt',
        file,
        line: lineNo,
        stableKey: code,
        detail: 'Runtime mock data in production source must move behind fixtures/contracts.',
      })
    }

    if (!test && line.includes('Preview data')) {
      addIssue(issues, {
        kind: 'preview-data-ui',
        file,
        line: lineNo,
        stableKey: code,
        detail: 'Production navigation should not present preview data as a shipped surface.',
      })
    }

    if (!test && /\bas\s+any\b|:\s*any\b/.test(code)) {
      addIssue(issues, {
        kind: 'explicit-any',
        file,
        line: lineNo,
        stableKey: code,
        detail: 'Use unknown plus narrowing or a named DTO; ADR-0001 forbids any.',
      })
    }

    const ternaryQuestions = (code.match(/\?/g) ?? []).length
    const optionalChains = (code.match(/\?\./g) ?? []).length
    const nullish = (code.match(/\?\?/g) ?? []).length
    if (ternaryQuestions - optionalChains - nullish > 1) {
      addIssue(issues, {
        kind: 'nested-ternary',
        file,
        line: lineNo,
        stableKey: code,
        detail: 'Nested ternary detected; use a named helper or explicit branch.',
      })
    }
  })
}

const functionNameFromLine = (line) => {
  const patterns = [
    /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/,
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/,
    /\b([A-Za-z_$][\w$]*)\s*:\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/,
  ]
  for (const pattern of patterns) {
    const match = line.match(pattern)
    if (match) return match[1]
  }
  return null
}

const complexityIncrement = (line) => {
  const code = compact(line)
  if (!code) return 0
  const keywordHits = code.match(/\b(if|for|while|case|catch)\b/g)?.length ?? 0
  const booleanHits = code.match(/&&|\|\|/g)?.length ?? 0
  const ternaryHits =
    (code.match(/\?/g)?.length ?? 0) -
    (code.match(/\?\./g)?.length ?? 0) -
    (code.match(/\?\?/g)?.length ?? 0)
  return keywordHits + booleanHits + Math.max(0, ternaryHits)
}

const detectComplexity = (path, raw, issues) => {
  const file = rel(path)
  if (isTestFile(file)) return

  let current = null
  const lines = raw.split('\n')
  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx]
    const code = compact(line)
    const name = current ? null : functionNameFromLine(code)

    if (name) {
      current = {
        name,
        startLine: idx + 1,
        braceDepth: 0,
        seenBrace: false,
        complexity: 1,
      }
    }

    if (!current) continue

    current.complexity += complexityIncrement(code)
    const opens = (code.match(/\{/g) ?? []).length
    const closes = (code.match(/\}/g) ?? []).length
    current.braceDepth += opens - closes
    current.seenBrace ||= opens > 0

    if (current.seenBrace && current.braceDepth <= 0) {
      if (current.complexity > MAX_COMPLEXITY) {
        addIssue(issues, {
          kind: 'cyclomatic-complexity',
          file,
          line: current.startLine,
          stableKey: current.name,
          detail: `${current.name} complexity ${current.complexity} exceeds max ${MAX_COMPLEXITY}.`,
        })
      }
      current = null
    }
  }
}

const normalizeForDuplication = (line) => {
  const code = compact(line)
    .replace(/(['"`])(?:\\.|(?!\1).)*\1/g, 'STR')
    .replace(/\b\d+(?:_\d+)*(?:\.\d+)?\b/g, 'NUM')
    .replace(/\s+/g, ' ')
    .trim()
  if (code.length < 8) return ''
  if (/^(import|export)\b/.test(code)) return ''
  if (/^[{}()[\],;]+$/.test(code)) return ''
  return code
}

const detectDuplicateBlocks = (files, issues) => {
  const seen = new Map()

  for (const path of files) {
    const file = rel(path)
    if (isTestFile(file)) continue
    const normalized = readSource(path).split('\n').map(normalizeForDuplication)

    for (let idx = 0; idx <= normalized.length - DUPLICATE_WINDOW; idx += 1) {
      const window = normalized.slice(idx, idx + DUPLICATE_WINDOW)
      if (window.some((line) => !line)) continue
      const block = window.join('\n')
      const key = hash(block)
      const first = seen.get(key)
      const location = { file, line: idx + 1 }
      if (!first) {
        seen.set(key, location)
        continue
      }
      if (first.file === location.file && Math.abs(first.line - location.line) < DUPLICATE_WINDOW) {
        continue
      }
      addIssue(issues, {
        kind: 'duplicate-block',
        file,
        line: location.line,
        stableKey: key,
        detail: `Duplicate ${DUPLICATE_WINDOW}-line block also appears at ${first.file}:${first.line}.`,
      })
    }
  }
}

const collectIssues = () => {
  const issues = []
  for (const file of sourceFiles) {
    const raw = readSource(file)
    detectPatternDebt(file, raw, issues)
    detectComplexity(file, raw, issues)
  }
  detectDuplicateBlocks(sourceFiles, issues)
  return issues.sort((a, b) => a.id.localeCompare(b.id))
}

const loadBaseline = () => {
  if (!existsSync(BASELINE_PATH)) return null
  return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
}

const writeBaseline = (issues) => {
  const byKind = {}
  for (const issue of issues) byKind[issue.kind] = (byKind[issue.kind] ?? 0) + 1
  const payload = {
    version: 1,
    generatedBy: 'scripts/check-architecture-guardrails.mjs',
    maxComplexity: MAX_COMPLEXITY,
    duplicateWindow: DUPLICATE_WINDOW,
    totals: {
      filesScanned: sourceFiles.length,
      issues: issues.length,
      byKind,
    },
    issues: issues.map(({ id, kind, file, line, detail }) => ({ id, kind, file, line, detail })),
  }
  mkdirSync(dirname(BASELINE_PATH), { recursive: true })
  writeFileSync(BASELINE_PATH, `${JSON.stringify(payload, null, 2)}\n`)
}

const current = collectIssues()

if (UPDATE) {
  writeBaseline(current)
  console.log(`Architecture guardrail baseline updated: ${current.length} existing issue(s).`)
  process.exit(0)
}

const baseline = loadBaseline()
if (!baseline) {
  console.error('Architecture guardrail baseline is missing.')
  console.error('Run: node scripts/check-architecture-guardrails.mjs --update-baseline')
  process.exit(1)
}

const baselineIds = new Set((baseline.issues ?? []).map((issue) => issue.id))
const newIssues = current.filter((issue) => !baselineIds.has(issue.id))

if (newIssues.length > 0) {
  console.error('Architecture guardrail violation: new architecture debt detected.\n')
  for (const issue of newIssues.slice(0, 50)) {
    console.error(`  - ${issue.kind}: ${issue.file}:${issue.line} — ${issue.detail}`)
  }
  if (newIssues.length > 50) {
    console.error(`  ...and ${newIssues.length - 50} more.`)
  }
  console.error('\nFix the code, or intentionally update the baseline after cleanup/review:')
  console.error('  node scripts/check-architecture-guardrails.mjs --update-baseline')
  process.exit(1)
}

const removed = (baseline.issues ?? []).filter((issue) => !current.some((it) => it.id === issue.id))
if (removed.length > 0) {
  console.log(`Architecture guardrails passed. ${removed.length} baseline issue(s) have been cleaned up; update the baseline when ready.`)
} else {
  console.log(`Architecture guardrails passed. No new debt beyond ${current.length} baselined issue(s).`)
}
