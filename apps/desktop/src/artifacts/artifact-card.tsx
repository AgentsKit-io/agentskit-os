/**
 * ArtifactCard — wrapper card presenting one artifact with metadata,
 * a kind badge, a copy button, and a fullscreen button.
 */

import { useCallback, useState } from 'react'
import type { Artifact, ArtifactKind } from './artifact-types'
import { CodeRenderer } from './renderers/code-renderer'
import { JsonRenderer } from './renderers/json-renderer'
import { CsvRenderer } from './renderers/csv-renderer'
import { SvgRenderer } from './renderers/svg-renderer'
import { MermaidRenderer } from './renderers/mermaid-renderer'
import { HtmlRenderer } from './renderers/html-renderer'
import { MarkdownRenderer } from './renderers/markdown-renderer'
import { ImageRenderer } from './renderers/image-renderer'
import { useArtifactViewer } from './use-artifact-viewer'
import { ARTIFACT_KIND_LABELS } from './artifact-labels'

// ---------------------------------------------------------------------------
// Kind badge
// ---------------------------------------------------------------------------

const KIND_COLORS: Record<ArtifactKind, string> = {
  code: 'bg-violet-500/15 text-violet-400',
  json: 'bg-amber-500/15 text-amber-400',
  yaml: 'bg-orange-500/15 text-orange-400',
  csv: 'bg-green-500/15 text-green-400',
  svg: 'bg-pink-500/15 text-pink-400',
  mermaid: 'bg-blue-500/15 text-blue-400',
  html: 'bg-red-500/15 text-red-400',
  markdown: 'bg-sky-500/15 text-sky-400',
  image: 'bg-purple-500/15 text-purple-400',
  unknown: 'bg-zinc-500/15 text-zinc-400',
}

type KindBadgeProps = { kind: ArtifactKind }

function KindBadge({ kind }: KindBadgeProps): React.JSX.Element {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-widest ${KIND_COLORS[kind]}`}
    >
      {ARTIFACT_KIND_LABELS[kind]}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Renderer selector
// ---------------------------------------------------------------------------

function ArtifactContent({ artifact }: { artifact: Artifact }): React.JSX.Element {
  switch (artifact.kind) {
    case 'code':
      return <CodeRenderer content={artifact.content} />
    case 'json':
      return <JsonRenderer content={artifact.content} />
    case 'csv':
      return <CsvRenderer content={artifact.content} />
    case 'svg':
      return <SvgRenderer content={artifact.content} />
    case 'mermaid':
      return <MermaidRenderer content={artifact.content} />
    case 'html':
      return <HtmlRenderer content={artifact.content} />
    case 'markdown':
      return <MarkdownRenderer content={artifact.content} />
    case 'image':
      return <ImageRenderer content={artifact.content} name={artifact.name} />
    case 'yaml':
    case 'unknown':
    default:
      return <CodeRenderer content={artifact.content} />
  }
}

// ---------------------------------------------------------------------------
// ArtifactCard
// ---------------------------------------------------------------------------

export type ArtifactCardProps = {
  readonly artifact: Artifact
}

export function ArtifactCard({ artifact }: ArtifactCardProps): React.JSX.Element {
  const { open } = useArtifactViewer()
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(artifact.content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [artifact.content])

  const handleFullscreen = useCallback(() => {
    open(artifact)
  }, [open, artifact])

  const title = artifact.name ?? `${ARTIFACT_KIND_LABELS[artifact.kind]} artifact`

  return (
    <article
      aria-label={title}
      className="rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)] shadow-sm"
    >
      {/* Card header */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--ag-line)] px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <KindBadge kind={artifact.kind} />
          <span className="truncate text-xs font-medium text-[var(--ag-ink)]">{title}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Copy button */}
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? 'Copied!' : 'Copy artifact content'}
            className="rounded px-2 py-1 text-[11px] text-[var(--ag-ink-muted)] transition-colors hover:bg-[var(--ag-panel-alt)] hover:text-[var(--ag-ink)]"
          >
            {copied ? '✓' : '⎘'}
          </button>
          {/* Fullscreen button */}
          <button
            type="button"
            onClick={handleFullscreen}
            aria-label="View artifact fullscreen"
            title="View fullscreen (Cmd+Shift+A)"
            className="rounded px-2 py-1 text-[11px] text-[var(--ag-ink-muted)] transition-colors hover:bg-[var(--ag-panel-alt)] hover:text-[var(--ag-ink)]"
          >
            ⤢
          </button>
        </div>
      </div>

      {/* Artifact content */}
      <div className="p-3">
        <ArtifactContent artifact={artifact} />
      </div>
    </article>
  )
}
