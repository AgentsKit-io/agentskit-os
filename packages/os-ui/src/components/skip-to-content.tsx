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
        top: 0,
        left: 0,
        padding: '0.5rem 1rem',
        background: 'var(--ag-surface, #08090c)',
        color: 'var(--ag-accent, #22d3ee)',
        fontWeight: 600,
        fontSize: '0.875rem',
        zIndex: 9999,
        // Visually hidden until focused
        transform: 'translateY(-100%)',
        transition: 'transform 0.1s ease',
        outline: '2px solid var(--ag-accent, #22d3ee)',
        outlineOffset: '2px',
        textDecoration: 'none',
        borderRadius: '0 0 0.25rem 0.25rem',
      }}
      onFocus={(e) => {
        ;(e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)'
      }}
      onBlur={(e) => {
        ;(e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-100%)'
      }}
    >
      {label}
    </a>
  )
}
