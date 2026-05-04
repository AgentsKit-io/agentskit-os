/**
 * detectArtifactKind — pure heuristic: MIME first, content fallback.
 *
 * Priority:
 *   1. Exact MIME matches
 *   2. MIME prefix / wildcard matches
 *   3. Content sniffing (JSON.parse, YAML markers, CSV lines, SVG tag, etc.)
 *   4. 'unknown' fallback
 */

import type { ArtifactKind } from './artifact-types'

// ---------------------------------------------------------------------------
// MIME-based detection
// ---------------------------------------------------------------------------

const MIME_MAP: ReadonlyArray<readonly [string, ArtifactKind]> = [
  ['application/json', 'json'],
  ['text/json', 'json'],
  ['application/x-yaml', 'yaml'],
  ['text/yaml', 'yaml'],
  ['text/x-yaml', 'yaml'],
  ['application/yaml', 'yaml'],
  ['text/csv', 'csv'],
  ['image/svg+xml', 'svg'],
  ['text/html', 'html'],
  ['text/markdown', 'markdown'],
  ['text/x-markdown', 'markdown'],
  ['text/plain', 'code'], // plain text → code renderer
]

const IMAGE_MIME_PREFIX = 'image/'

function detectByMime(mime: string): ArtifactKind | null {
  const normalized = mime.toLowerCase().trim()
  if (!normalized) return null

  // Strip parameters (e.g. "text/html; charset=utf-8" → "text/html")
  const base = normalized.split(';')[0]?.trim() ?? normalized

  for (const [pattern, kind] of MIME_MAP) {
    if (base === pattern) return kind
  }

  if (base.startsWith(IMAGE_MIME_PREFIX)) return 'image'
  if (base.startsWith('text/x-')) return 'code'
  if (base.startsWith('application/') && base.includes('script')) return 'code'

  return null
}

// ---------------------------------------------------------------------------
// Content sniffing helpers
// ---------------------------------------------------------------------------

/** Attempt JSON.parse; returns true if content is valid JSON object/array. */
function looksLikeJson(content: string): boolean {
  const trimmed = content.trimStart()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false
  try {
    const parsed: unknown = JSON.parse(content)
    return typeof parsed === 'object' && parsed !== null
  } catch {
    return false
  }
}

/**
 * Minimal YAML heuristic: starts with "---" OR has key: value lines
 * and doesn't look like JSON.
 */
function looksLikeYaml(content: string): boolean {
  if (looksLikeJson(content)) return false
  const trimmed = content.trim()
  if (trimmed.startsWith('---')) return true
  // Two or more lines matching "key: value" pattern
  const lines = trimmed.split('\n').slice(0, 10)
  const kvLines = lines.filter((l) => /^\s*[\w-]+\s*:/.test(l))
  return kvLines.length >= 2
}

/**
 * CSV heuristic: multiple lines with the same delimiter count and at least
 * two columns. We check for comma or tab as delimiter.
 */
function looksLikeCsv(content: string): boolean {
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 6)
  if (lines.length < 2) return false

  for (const delim of [',', '\t']) {
    const counts = lines.map((l) => l.split(delim).length)
    const first = counts[0]!
    if (first >= 2 && counts.every((c) => c === first)) return true
  }
  return false
}

/** Detects fenced mermaid blocks (```mermaid ... ```) */
function looksLikeMermaid(content: string): boolean {
  return /^```mermaid\b/im.test(content)
}

/** Detects SVG — must contain an <svg element */
function looksLikeSvg(content: string): boolean {
  return /<svg[\s>]/i.test(content.trimStart())
}

/** Detects HTML — contains common HTML structure signals */
function looksLikeHtml(content: string): boolean {
  const trimmed = content.trimStart()
  return (
    /^<!doctype\s+html/i.test(trimmed) ||
    /^<html[\s>]/i.test(trimmed) ||
    /<\/?(body|head|div|p|span|script|style)\b/i.test(trimmed)
  )
}

/** Detects Markdown — headings, bold, links, code fences */
function looksLikeMarkdown(content: string): boolean {
  return (
    /^#{1,6}\s/m.test(content) ||
    /\*\*[^*]+\*\*/.test(content) ||
    /\[.+\]\(.+\)/.test(content) ||
    /^```/m.test(content)
  )
}

/** Data URL or https:// image */
function looksLikeImage(content: string): boolean {
  return (
    /^data:image\//i.test(content) ||
    /^https?:\/\/.+\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(content.trim())
  )
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function detectArtifactKind(mime: string, content: string): ArtifactKind {
  // 1. MIME-based
  const byMime = detectByMime(mime)
  if (byMime !== null && byMime !== 'code') return byMime

  // 2. Content sniffing (order matters — more specific checks first)
  if (looksLikeMermaid(content)) return 'mermaid'
  if (looksLikeSvg(content)) return 'svg'
  if (looksLikeJson(content)) return 'json'
  if (looksLikeYaml(content)) return 'yaml'
  if (looksLikeCsv(content)) return 'csv'
  if (looksLikeHtml(content)) return 'html'
  if (looksLikeMarkdown(content)) return 'markdown'
  if (looksLikeImage(content)) return 'image'

  // 3. Fallback from MIME text/plain
  if (byMime === 'code') return 'code'

  return 'unknown'
}
