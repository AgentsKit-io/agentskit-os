/**
 * SvgRenderer — renders an SVG after stripping script tags.
 *
 * Security: script tags and event-handler attributes (on*) are stripped
 * before rendering. The SVG is displayed in the same origin, so for
 * fully untrusted content, the html-renderer's sandboxed iframe is safer.
 *
 * Note: dangerouslySetInnerHTML is used intentionally here AFTER sanitization.
 * The sanitizeSvg function removes all script elements and inline event handlers.
 */

import { useMemo } from 'react'

export type SvgRendererProps = {
  readonly content: string
}

/**
 * Strip script blocks and inline event handlers (on* attributes)
 * from SVG content. Best-effort sanitiser blocking the most common vectors.
 */
function sanitizeSvg(raw: string): string {
  return raw
    // Remove <script ...>...</script> blocks
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script\b[^>]*\/>/gi, '')
    // Remove inline event handlers: onload="...", onclick="...", etc.
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Remove javascript: href values
    .replace(/href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '')
}

export function SvgRenderer({ content }: SvgRendererProps): React.JSX.Element {
  const sanitized = useMemo(() => sanitizeSvg(content), [content])

  // Safe: script tags and event handlers stripped before rendering
  /* eslint-disable-next-line react/no-danger */
  return (
    <div
      className="overflow-auto rounded-md border border-[var(--ag-line)] bg-white p-4"
      dangerouslySetInnerHTML={{ __html: sanitized }}
      aria-label="SVG diagram"
      role="img"
    />
  )
}
