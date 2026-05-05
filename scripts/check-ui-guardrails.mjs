#!/usr/bin/env node
// Frontend/UI guardrails.
//
// This check is dependency-free and baseline-based. It blocks new UI debt while
// letting existing cleanup happen incrementally:
//   node scripts/check-ui-guardrails.mjs --update-baseline

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, extname, join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const BASELINE_PATH = join(ROOT, '.agentskitos-ui-baseline.json')
const UPDATE = process.argv.includes('--update-baseline')

const SOURCE_ROOTS = ['apps/desktop/src']
const EXTENSIONS = new Set(['.ts', '.tsx'])
const MAX_COMPONENT_LINES = 140
const MAX_SCREEN_LINES = 240
const MAX_HOOK_LINES = 180
const MAX_INLINE_CLASS_CHARS = 220

const EXCLUDED_PARTS = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.turbo',
  '__tests__',
])

const hash = (input) => createHash('sha256').update(input).digest('hex').slice(0, 16)
const rel = (path) => relative(ROOT, path).replaceAll('\\', '/')
const isTestFile = (path) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(path) || /\/test-setup\.ts$/.test(path)
const shouldSkipPath = (path) => path.split('/').some((part) => EXCLUDED_PARTS.has(part)) || isTestFile(path)

const walk = (dir, out = []) => {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    const pathRel = rel(path)
    if (shouldSkipPath(pathRel)) continue
    const stat = statSync(path)
    if (stat.isDirectory()) walk(path, out)
    else if (EXTENSIONS.has(extname(path))) out.push(path)
  }
  return out
}

const sourceFiles = SOURCE_ROOTS.flatMap((root) => walk(join(ROOT, root))).sort()

const readSource = (path) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n')

const addIssue = (issues, issue) => {
  issues.push({
    ...issue,
    id: `${issue.kind}:${issue.file}:${hash(issue.stableKey ?? issue.detail)}`,
  })
}

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

const functionNameFromLine = (line) => {
  const patterns = [
    /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/,
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/,
  ]
  for (const pattern of patterns) {
    const match = line.match(pattern)
    if (match) return match[1]
  }
  return null
}

const lineLimitFor = (file, name) => {
  if (/\/screens\/[^/]+\/index\.tsx$/.test(file)) return MAX_SCREEN_LINES
  if (name.startsWith('use')) return MAX_HOOK_LINES
  return MAX_COMPONENT_LINES
}

const detectOversizedUnits = (path, raw, issues) => {
  const file = rel(path)
  const lines = raw.split('\n')
  let current = null

  for (let idx = 0; idx < lines.length; idx += 1) {
    const code = compact(lines[idx])
    const name = current ? null : functionNameFromLine(code)

    if (name) {
      current = {
        name,
        startLine: idx + 1,
        braceDepth: 0,
        seenBrace: false,
      }
    }

    if (!current) continue

    const opens = (code.match(/\{/g) ?? []).length
    const closes = (code.match(/\}/g) ?? []).length
    current.braceDepth += opens - closes
    current.seenBrace ||= opens > 0

    if (current.seenBrace && current.braceDepth <= 0) {
      const lineCount = idx + 1 - current.startLine + 1
      const maxLines = lineLimitFor(file, current.name)
      if (lineCount > maxLines) {
        addIssue(issues, {
          kind: 'oversized-ui-unit',
          file,
          line: current.startLine,
          stableKey: `${current.name}:${maxLines}`,
          detail: `${current.name} is ${lineCount} lines; keep components under ${maxLines} lines or split logic into hooks/primitives.`,
        })
      }
      current = null
    }
  }
}

const HARD_CODED_COLOR_CLASS =
  /\b(?:bg|text|border|from|to|via|ring)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/

const FORMAT_HELPER = /\b(?:function|const)\s+(format(?:Date|Time|Duration|Currency|Cost|Tokens|Bytes|Number)\w*)\b/

const detectPatternDebt = (path, raw, issues) => {
  const file = rel(path)
  const lines = raw.split('\n')
  const isTsx = file.endsWith('.tsx')
  const isHookFile = /\/use-[^/]+\.[tj]sx?$/.test(file) || /\/hooks?\//.test(file)
  const isVisualComponent = isTsx && !isHookFile

  lines.forEach((line, idx) => {
    const lineNo = idx + 1
    const code = compact(line)

    if (isVisualComponent && /\bsidecarRequest\s*(?:<[^>]+>)?\s*\(/.test(code)) {
      addIssue(issues, {
        kind: 'sidecar-in-component',
        file,
        line: lineNo,
        stableKey: code,
        detail: 'Move sidecar/IPC calls out of visual components and into typed hooks or services.',
      })
    }

    if (isVisualComponent && /\b(?:Date\.now|new\s+Date)\s*\(/.test(code)) {
      addIssue(issues, {
        kind: 'inline-date-in-component',
        file,
        line: lineNo,
        stableKey: code,
        detail: 'Move date math/formatting into hooks/shared utilities and prefer date-fns for non-trivial date handling.',
      })
    }

    if (isVisualComponent && HARD_CODED_COLOR_CLASS.test(line)) {
      addIssue(issues, {
        kind: 'hardcoded-color-class',
        file,
        line: lineNo,
        stableKey: line.trim(),
        detail: 'Use semantic visual tokens or shared variants instead of hardcoded color utility classes in feature screens.',
      })
    }

    if (isVisualComponent && line.includes('className=') && line.length > MAX_INLINE_CLASS_CHARS) {
      addIssue(issues, {
        kind: 'giant-inline-classname',
        file,
        line: lineNo,
        stableKey: line.trim(),
        detail: 'Large className strings should become small components, variants, or cn/cva helpers.',
      })
    }

    if (/\/screens\//.test(file) && FORMAT_HELPER.test(code)) {
      addIssue(issues, {
        kind: 'screen-format-helper',
        file,
        line: lineNo,
        stableKey: code,
        detail: 'Formatting helpers duplicated in screens should move to shared utilities or hooks.',
      })
    }

    if (/\/screens\//.test(file) && /\b(?:STATUS|STATE)_(?:LABELS|CLASSES|COLORS|STYLES)\b/.test(code)) {
      addIssue(issues, {
        kind: 'screen-status-map',
        file,
        line: lineNo,
        stableKey: code,
        detail: 'Status labels/styles should use shared badge/status primitives instead of per-screen maps.',
      })
    }
  })
}

const collectIssues = () => {
  const issues = []
  for (const file of sourceFiles) {
    const raw = readSource(file)
    detectOversizedUnits(file, raw, issues)
    detectPatternDebt(file, raw, issues)
  }
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
    generatedBy: 'scripts/check-ui-guardrails.mjs',
    maxComponentLines: MAX_COMPONENT_LINES,
    maxScreenLines: MAX_SCREEN_LINES,
    maxHookLines: MAX_HOOK_LINES,
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
  console.log(`UI guardrail baseline updated: ${current.length} existing issue(s).`)
  process.exit(0)
}

const baseline = loadBaseline()
if (!baseline) {
  console.error('UI guardrail baseline is missing.')
  console.error('Run: node scripts/check-ui-guardrails.mjs --update-baseline')
  process.exit(1)
}

const baselineIds = new Set((baseline.issues ?? []).map((issue) => issue.id))
const newIssues = current.filter((issue) => !baselineIds.has(issue.id))

if (newIssues.length > 0) {
  console.error('UI guardrail violation: new frontend/UI debt detected.\n')
  for (const issue of newIssues.slice(0, 50)) {
    console.error(`  - ${issue.kind}: ${issue.file}:${issue.line} — ${issue.detail}`)
  }
  if (newIssues.length > 50) {
    console.error(`  ...and ${newIssues.length - 50} more.`)
  }
  console.error('\nFix the code, or intentionally update the baseline after cleanup/review:')
  console.error('  node scripts/check-ui-guardrails.mjs --update-baseline')
  process.exit(1)
}

const currentIds = new Set(current.map((issue) => issue.id))
const removed = (baseline.issues ?? []).filter((issue) => !currentIds.has(issue.id))
if (removed.length > 0) {
  console.log(`UI guardrails passed. ${removed.length} baseline issue(s) have been cleaned up; update the baseline when ready.`)
} else {
  console.log(`UI guardrails passed. No new debt beyond ${current.length} baselined issue(s).`)
}
