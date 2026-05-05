/**
 * ArtifactCard — wrapper card presenting one artifact with metadata,
 * a kind badge, a copy button, and a fullscreen button.
 */

import { useCallback, useState } from 'react'
import type { Artifact, ArtifactKind } from './artifact-types'
import { useArtifactViewer } from './use-artifact-viewer'
import { ARTIFACT_KIND_LABELS } from './artifact-labels'
import { ArtifactContent } from './artifact-content'

// ---------------------------------------------------------------------------
// Kind badge
// ---------------------------------------------------------------------------

const KIND_COLORS: Record<ArtifactKind, string> = {
  code: 'bg-[var(--ag-accent)]/15 text-[var(--ag-accent)]',
  json: 'bg-[var(--ag-warn)]/15 text-[var(--ag-warn)]',
  yaml: 'bg-[var(--ag-warn)]/15 text-[var(--ag-warn)]',
  csv: 'bg-[var(--ag-success)]/15 text-[var(--ag-success)]',
  svg: 'bg-[var(--ag-accent)]/15 text-[var(--ag-accent)]',
  mermaid: 'bg-[var(--ag-accent)]/15 text-[var(--ag-accent)]',
  html: 'bg-[var(--ag-danger)]/15 text-[var(--ag-danger)]',
  markdown: 'bg-[var(--ag-accent)]/15 text-[var(--ag-accent)]',
  image: 'bg-[var(--ag-accent)]/15 text-[var(--ag-accent)]',
  unknown: 'bg-[var(--ag-ink-muted)]/15 text-[var(--ag-ink-muted)]',
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
        <ArtifactContent artifact={artifact} wordWrap />
      </div>
    </article>
  )
}
