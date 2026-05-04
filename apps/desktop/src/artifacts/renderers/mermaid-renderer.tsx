/**
 * MermaidRenderer — renders a Mermaid diagram.
 *
 * This renderer checks for a globally-loaded `mermaid` object (e.g. loaded
 * via a CDN script tag). If Mermaid is not available at render time, a stub
 * is shown displaying the source with a notice.
 *
 * TODO: Load mermaid.js dynamically via import() when a bundled solution is
 * adopted. Per design constraints, we do NOT add mermaid as a
 * direct npm dependency in this milestone.
 */

import { useEffect, useRef, useState } from 'react'
import { CodeRenderer } from './code-renderer'

export type MermaidRendererProps = {
  readonly content: string
}

/** The fenced mermaid source: strips triple-backtick mermaid wrappers if present. */
function extractMermaidSource(content: string): string {
  const match = /^```mermaid\s*\n([\s\S]*?)\n?```\s*$/im.exec(content)
  return match?.[1]?.trim() ?? content.trim()
}

type MermaidGlobal = {
  render: (id: string, src: string) => Promise<{ svg: string }>
}

/** Check if the mermaid global is available (loaded via CDN). */
function getMermaidGlobal(): MermaidGlobal | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as Record<string, unknown>
  if (typeof w['mermaid'] === 'object' && w['mermaid'] !== null) {
    return w['mermaid'] as MermaidGlobal
  }
  return null
}

export function MermaidRenderer({ content }: MermaidRendererProps): React.JSX.Element {
  const source = extractMermaidSource(content)
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const mermaid = getMermaidGlobal()
    if (!mermaid) {
      setSvg(null)
      return
    }

    const id = `mermaid-${Math.random().toString(36).slice(2)}`
    mermaid
      .render(id, source)
      .then(({ svg: rendered }) => {
        setSvg(rendered)
        setError(null)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Mermaid render failed')
      })
  }, [source])

  if (error !== null) {
    return (
      <div className="flex flex-col gap-2">
        <div className="rounded-md border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-400">
          Mermaid render error: {error}
        </div>
        <CodeRenderer content={source} language="mermaid" />
      </div>
    )
  }

  if (svg !== null) {
    return (
      <div
        className="overflow-auto rounded-md border border-[var(--ag-line)] bg-white p-4"
        aria-label="Mermaid diagram"
        role="img"
        ref={containerRef}
      >
        {/* Mermaid library trusted SVG output — rendered into the DOM via ref */}
        <span ref={(el) => { if (el) el.innerHTML = svg }} />
      </div>
    )
  }

  // Mermaid.js not loaded — stub with source + notice
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
        Diagram preview pending mermaid.js load. The source is shown below.
      </div>
      <CodeRenderer content={source} language="mermaid" />
    </div>
  )
}
