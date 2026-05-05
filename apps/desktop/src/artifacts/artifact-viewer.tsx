/**
 * ArtifactViewer — fullscreen modal for immersive artifact inspection (U-7).
 *
 * Features:
 *   - Renders the currently focused artifact at full viewport size
 *   - Toolbar: toggle word-wrap, copy content, download, close
 *   - Cmd+Shift+A global toggle (close when open, no-op when closed)
 *   - Escape key closes the viewer
 *   - Keyboard focus trap while open
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useArtifactViewer } from './use-artifact-viewer'
import type { Artifact, ArtifactKind } from './artifact-types'
import { CodeRenderer } from './renderers/code-renderer'
import { JsonRenderer } from './renderers/json-renderer'
import { CsvRenderer } from './renderers/csv-renderer'
import { SvgRenderer } from './renderers/svg-renderer'
import { MermaidRenderer } from './renderers/mermaid-renderer'
import { HtmlRenderer } from './renderers/html-renderer'
import { MarkdownRenderer } from './renderers/markdown-renderer'
import { ImageRenderer } from './renderers/image-renderer'
import { ARTIFACT_KIND_LABELS } from './artifact-labels'

// ---------------------------------------------------------------------------
// Kind label map (duplicated to avoid circular dep with artifact-card)
// ---------------------------------------------------------------------------

const KIND_LABELS: Record<ArtifactKind, string> = ARTIFACT_KIND_LABELS

// ---------------------------------------------------------------------------
// Content renderer (same logic as ArtifactCard)
// ---------------------------------------------------------------------------

function ArtifactContent({
  artifact,
  wordWrap,
}: {
  artifact: Artifact
  wordWrap: boolean
}): React.JSX.Element {
  switch (artifact.kind) {
    case 'code':
    case 'yaml':
    case 'unknown':
      return (
        <div className={wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'}>
          <CodeRenderer content={artifact.content} />
        </div>
      )
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
    default:
      return <CodeRenderer content={artifact.content} />
  }
}

// ---------------------------------------------------------------------------
// ArtifactViewer modal
// ---------------------------------------------------------------------------

type ArtifactViewerModalProps = {
  artifact: Artifact
  onClose: () => void
}

function ArtifactViewerModal({ artifact, onClose }: ArtifactViewerModalProps): React.JSX.Element {
  const [wordWrap, setWordWrap] = useState(false)
  const [copied, setCopied] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Escape key closes
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Focus trap: focus dialog on open
  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(artifact.content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [artifact.content])

  const handleDownload = useCallback(() => {
    const ext = artifact.kind === 'unknown' ? 'txt' : artifact.kind
    const fileName = artifact.name ?? `artifact.${ext}`
    const blob = new Blob([artifact.content], { type: artifact.mime || 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }, [artifact])

  const title = artifact.name ?? `${ARTIFACT_KIND_LABELS[artifact.kind]} artifact`

  return (
    /* Backdrop */
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Immersive artifact viewer: ${title}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        // Close if clicking the backdrop (not the panel)
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Panel */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative flex h-[90vh] w-[90vw] max-w-6xl flex-col rounded-xl border border-[var(--ag-line)] bg-[var(--ag-surface)] shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-[var(--ag-line)] px-4 py-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate text-sm font-semibold text-[var(--ag-ink)]">{title}</span>
            <span className="text-[10px] uppercase tracking-widest text-[var(--ag-ink-subtle)]">
              {ARTIFACT_KIND_LABELS[artifact.kind]}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* Word wrap toggle */}
            <button
              type="button"
              onClick={() => setWordWrap((w) => !w)}
              aria-pressed={wordWrap}
              aria-label="Toggle word wrap"
              title="Toggle word wrap"
              className={[
                'rounded px-2 py-1 text-xs transition-colors',
                wordWrap
                  ? 'bg-[var(--ag-accent)]/15 text-[var(--ag-accent)]'
                  : 'text-[var(--ag-ink-muted)] hover:bg-[var(--ag-panel-alt)] hover:text-[var(--ag-ink)]',
              ].join(' ')}
            >
              ≡↵
            </button>

            {/* Copy */}
            <button
              type="button"
              onClick={handleCopy}
              aria-label={copied ? 'Copied!' : 'Copy content'}
              className="rounded px-2 py-1 text-xs text-[var(--ag-ink-muted)] transition-colors hover:bg-[var(--ag-panel-alt)] hover:text-[var(--ag-ink)]"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>

            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              aria-label="Download artifact"
              className="rounded px-2 py-1 text-xs text-[var(--ag-ink-muted)] transition-colors hover:bg-[var(--ag-panel-alt)] hover:text-[var(--ag-ink)]"
            >
              ↓ Download
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close artifact viewer"
              className="ml-1 rounded px-2 py-1 text-xs text-[var(--ag-ink-muted)] transition-colors hover:bg-[var(--ag-panel-alt)] hover:text-[var(--ag-ink)]"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Artifact body */}
        <div className="flex-1 min-h-0 overflow-auto p-4">
          <ArtifactContent artifact={artifact} wordWrap={wordWrap} />
        </div>

        {/* Footer hint */}
        <div className="border-t border-[var(--ag-line)] px-4 py-1.5 text-[10px] text-[var(--ag-ink-subtle)] shrink-0">
          Press <kbd className="font-mono">Esc</kbd> or{' '}
          <kbd className="font-mono">Cmd+Shift+A</kbd> to close
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Public component — renders the modal when an artifact is open
// ---------------------------------------------------------------------------

export function ArtifactViewer(): React.JSX.Element | null {
  const { current, close } = useArtifactViewer()

  if (current === null) return null

  return <ArtifactViewerModal artifact={current} onClose={close} />
}
