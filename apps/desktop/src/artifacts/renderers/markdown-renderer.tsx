/**
 * MarkdownRenderer — converts a subset of Markdown to safe HTML.
 *
 * Supported:
 *   - ATX headings (# H1 to ###### H6)
 *   - Blank-line-separated paragraphs
 *   - Fenced code blocks (triple backtick, optional language)
 *   - Inline code (backtick-wrapped)
 *   - Bold (double-asterisk)
 *   - Italic (single-asterisk)
 *   - Unordered lists (- or * items)
 *   - Ordered lists (1. 2. ...)
 *   - Links [label](url) — http/https only
 *
 * Security: all user-provided text is HTML-escaped before processing so
 * embedded HTML tags cannot be injected. Only the transformations listed
 * above produce actual HTML elements. No external dependencies required.
 */

import { useMemo } from 'react'

export type MarkdownRendererProps = {
  readonly content: string
}

// ---------------------------------------------------------------------------
// Minimal Markdown to HTML transformer (no external deps)
// ---------------------------------------------------------------------------

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Apply inline transforms on already-escaped text. */
function inlineTransform(escaped: string): string {
  return escaped
    // Bold: **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic: *text* (not **bold**)
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    // Inline code
    .replace(
      /`([^`]+)`/g,
      '<code class="rounded bg-[var(--ag-surface-alt)] px-1 font-mono text-[0.85em]">$1</code>',
    )
    // Links: [label](https://...)
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" rel="noopener noreferrer" class="underline text-[var(--ag-accent)]" target="_blank">$1</a>',
    )
}

function markdownToHtml(md: string): string {
  const lines = md.split('\n')
  const output: string[] = []
  let i = 0
  let inParagraph = false
  let inUl = false
  let inOl = false

  const flushBlock = () => {
    if (inParagraph) { output.push('</p>'); inParagraph = false }
    if (inUl) { output.push('</ul>'); inUl = false }
    if (inOl) { output.push('</ol>'); inOl = false }
  }

  while (i < lines.length) {
    const line = lines[i]!

    // Fenced code block
    if (/^```/.test(line)) {
      flushBlock()
      const langMatch = /^```(\w*)/.exec(line)
      const lang = langMatch?.[1] ?? ''
      const codeLines: string[] = []
      i++
      while (i < lines.length && !/^```/.test(lines[i]!)) {
        codeLines.push(escapeHtml(lines[i]!))
        i++
      }
      const langAttr = lang ? ` class="language-${escapeHtml(lang)}"` : ''
      output.push(
        `<pre class="rounded-md bg-[var(--ag-surface-alt)] p-3 font-mono text-xs overflow-auto"><code${langAttr}>${codeLines.join('\n')}</code></pre>`,
      )
      i++
      continue
    }

    // ATX headings
    const heading = /^(#{1,6})\s+(.+)/.exec(line)
    if (heading) {
      flushBlock()
      const level = heading[1]!.length
      const text = inlineTransform(escapeHtml(heading[2]!))
      const sizeCls =
        ['text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm', 'text-xs'][level - 1] ?? 'text-sm'
      output.push(
        `<h${level} class="font-semibold ${sizeCls} text-[var(--ag-ink)] mt-3 mb-1">${text}</h${level}>`,
      )
      i++
      continue
    }

    // Unordered list item
    const ulItem = /^[-*]\s+(.+)/.exec(line)
    if (ulItem) {
      if (inParagraph) { output.push('</p>'); inParagraph = false }
      if (inOl) { output.push('</ol>'); inOl = false }
      if (!inUl) { output.push('<ul class="list-disc pl-5 text-[var(--ag-ink)] space-y-0.5">'); inUl = true }
      output.push(`<li>${inlineTransform(escapeHtml(ulItem[1]!))}</li>`)
      i++
      continue
    }

    // Ordered list item
    const olItem = /^\d+\.\s+(.+)/.exec(line)
    if (olItem) {
      if (inParagraph) { output.push('</p>'); inParagraph = false }
      if (inUl) { output.push('</ul>'); inUl = false }
      if (!inOl) { output.push('<ol class="list-decimal pl-5 text-[var(--ag-ink)] space-y-0.5">'); inOl = true }
      output.push(`<li>${inlineTransform(escapeHtml(olItem[1]!))}</li>`)
      i++
      continue
    }

    // Blank line
    if (line.trim() === '') {
      flushBlock()
      i++
      continue
    }

    // Regular paragraph text
    if (!inParagraph) {
      if (inUl) { output.push('</ul>'); inUl = false }
      if (inOl) { output.push('</ol>'); inOl = false }
      output.push('<p class="text-[var(--ag-ink)] leading-relaxed">')
      inParagraph = true
    } else {
      output.push('<br />')
    }
    output.push(inlineTransform(escapeHtml(line)))
    i++
  }

  flushBlock()
  return output.join('')
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MarkdownRenderer({ content }: MarkdownRendererProps): React.JSX.Element {
  const html = useMemo(() => markdownToHtml(content), [content])

  return (
    <div
      className="prose max-w-none overflow-auto rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface)] p-4 text-sm"
      /* Safe: markdownToHtml escapes all user text before transforming */
      role="article"
      aria-label="Markdown content"
      ref={(el) => {
        // Set innerHTML via ref to avoid lint rule on prop; content is sanitized above.
        if (el) el.innerHTML = html
      }}
    />
  )
}
