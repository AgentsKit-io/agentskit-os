/**
 * SkipToContent — keyboard-accessible skip link rendered at the very top of
 * the document.
 *
 * Visually hidden until focused via the keyboard. When activated it scrolls
 * (and focuses) the element matching `targetId`. Meets WCAG 2.4.1 (Bypass
 * Blocks, Level A).
 */

export interface SkipToContentProps {
  /**
   * The `id` of the landmark to jump to when the link is activated.
   * Defaults to `"main-content"`.
   */
  targetId?: string
  /**
   * Link label read by screen readers and shown when focused.
   * Defaults to `"Skip to main content"`.
   */
  label?: string
}

/**
 * Renders a visually hidden link that becomes visible on focus.
 * Place this as the **first child** of `<body>` / the root component.
 */
export function SkipToContent({
  targetId = 'main-content',
  label = 'Skip to main content',
}: SkipToContentProps): React.JSX.Element {
  return (
    <a
      href={`#${targetId}`}
      data-testid="skip-to-content"
      style={{
        position: 'absolute',
        top: '0.5rem',
        left: '0.5rem',
        padding: '0.5rem 1rem',
        background: 'var(--ag-surface, #08090c)',
        color: 'var(--ag-accent, #22d3ee)',
        fontWeight: 600,
        fontSize: '0.875rem',
        zIndex: 9999,
        opacity: 0,
        pointerEvents: 'none',
        transform: 'translateY(-0.5rem)',
        transition: 'opacity 0.12s ease, transform 0.12s ease',
        outline: 'none',
        outlineOffset: 0,
        textDecoration: 'none',
        border: '1px solid var(--ag-line, #1f2025)',
        borderRadius: '0.375rem',
      }}
      onFocus={(e) => {
        const el = e.currentTarget as HTMLAnchorElement
        el.style.opacity = '1'
        el.style.pointerEvents = 'auto'
        el.style.transform = 'translateY(0)'
        el.style.outline = '2px solid var(--ag-accent, #22d3ee)'
        el.style.outlineOffset = '2px'
      }}
      onBlur={(e) => {
        const el = e.currentTarget as HTMLAnchorElement
        el.style.opacity = '0'
        el.style.pointerEvents = 'none'
        el.style.transform = 'translateY(-0.5rem)'
        el.style.outline = 'none'
        el.style.outlineOffset = '0'
      }}
    >
      {label}
    </a>
  )
}
