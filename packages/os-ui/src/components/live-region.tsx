/**
 * LiveRegion — visually hidden, accessible announcement region.
 *
 * Renders an `aria-live` region that screen readers announce when
 * `message` changes. Use `politeness="assertive"` only for urgent
 * interruptions; prefer `"polite"` (default) for background updates.
 *
 * The element is visually hidden via the sr-only technique so it does
 * not affect layout.
 */

import { useEffect, useRef } from 'react'

export interface LiveRegionProps {
  /** The text message to announce. Changing this value triggers an SR announcement. */
  message: string
  /**
   * Controls how eagerly the screen reader interrupts the user.
   * @default "polite"
   */
  politeness?: 'polite' | 'assertive' | 'off'
  /**
   * When `true` the whole node is replaced on update, forcing re-announcement
   * even if the message string is identical to the previous value.
   * @default false
   */
  atomic?: boolean
}

/**
 * Lightweight live-region component for screen-reader announcements.
 *
 * Visually hidden (sr-only) but present in the accessibility tree.
 */
export function LiveRegion({
  message,
  politeness = 'polite',
  atomic = true,
}: LiveRegionProps): React.JSX.Element {
  const regionRef = useRef<HTMLDivElement>(null)

  // Briefly clear then re-set the message so screen readers re-announce
  // identical messages (e.g., repeated "Command run").
  useEffect(() => {
    const el = regionRef.current
    if (!el || !message) return
    el.textContent = ''
    const id = setTimeout(() => {
      el.textContent = message
    }, 50)
    return () => clearTimeout(id)
  }, [message])

  return (
    <div
      ref={regionRef}
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      // sr-only: visually hidden but readable by AT
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        borderWidth: 0,
      }}
    />
  )
}
