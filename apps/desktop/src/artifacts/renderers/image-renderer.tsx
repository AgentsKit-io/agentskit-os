/**
 * ImageRenderer — renders image artifacts.
 *
 * Accepted content formats:
 *   - data: URLs (e.g. "data:image/png;base64,...")
 *   - https:// URLs pointing to image files
 *
 * http:// (non-TLS) and other schemes are rejected and an error is shown
 * instead.
 */

import { useMemo } from 'react'

export type ImageRendererProps = {
  readonly content: string
  readonly name?: string | undefined
}

type ImageSource =
  | { valid: true; src: string }
  | { valid: false; reason: string }

function validateImageSource(content: string): ImageSource {
  const trimmed = content.trim()

  if (/^data:image\//i.test(trimmed)) {
    return { valid: true, src: trimmed }
  }

  if (/^https:\/\//i.test(trimmed)) {
    return { valid: true, src: trimmed }
  }

  if (/^http:\/\//i.test(trimmed)) {
    return { valid: false, reason: 'Plain HTTP (non-TLS) image URLs are not rendered for security.' }
  }

  return { valid: false, reason: `Unsupported image source scheme. Only data: and https:// are accepted.` }
}

export function ImageRenderer({ content, name }: ImageRendererProps): React.JSX.Element {
  const source = useMemo(() => validateImageSource(content), [content])

  if (!source.valid) {
    return (
      <div className="rounded-md border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-400">
        Cannot render image: {source.reason}
      </div>
    )
  }

  return (
    <div className="overflow-auto rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] p-4">
      <img
        src={source.src}
        alt={name ?? 'Artifact image'}
        className="max-h-[32rem] max-w-full object-contain"
      />
    </div>
  )
}
