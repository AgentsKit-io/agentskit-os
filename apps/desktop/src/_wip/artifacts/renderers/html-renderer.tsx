/**
 * HtmlRenderer — renders HTML content inside a sandboxed iframe.
 *
 * Security stance:
 *   - `sandbox="allow-scripts"` is set: scripts inside the iframe CAN run, but
 *     the iframe CANNOT access parent cookies/localStorage (no allow-same-origin),
 *     cannot submit forms (no allow-forms), cannot open popups (no allow-popups),
 *     and cannot navigate the top-level page (no allow-top-navigation).
 *   - `allow-same-origin` is intentionally OMITTED. With both allow-scripts and
 *     allow-same-origin, the sandboxed document could escape the sandbox and read
 *     parent session data — that combination must never be used for untrusted HTML.
 *   - Content is passed via `srcdoc` rather than `src` so no network request is
 *     made and the content stays local.
 *
 * This is appropriate for agent-generated HTML output viewed in the desktop app
 * where the user trusts the agent but wants isolation from the host app state.
 */

export type HtmlRendererProps = {
  readonly content: string
}

export function HtmlRenderer({ content }: HtmlRendererProps): React.JSX.Element {
  return (
    <iframe
      /* Isolation: scripts allowed, same-origin access denied */
      sandbox="allow-scripts"
      srcDoc={content}
      title="HTML artifact preview"
      aria-label="Sandboxed HTML preview"
      className="h-96 w-full rounded-md border border-[var(--ag-line)] bg-white"
    />
  )
}
