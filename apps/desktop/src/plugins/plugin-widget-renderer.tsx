/**
 * PluginWidgetRenderer — generic renderer for plugin-contributed widgets.
 *
 * Receives pluginId + kind + props; calls `sidecarRequest('plugins.widget.render', ...)`
 * to get an HTML string and renders it inside a sandboxed iframe.
 *
 * Sandbox: `sandbox="allow-scripts"` — no form submission, no same-origin,
 * no navigation. Scripts are allowed so plugin UIs can mount their own runtime.
 *
 * TODO #91/M5 — the sidecar implementation of `plugins.widget.render` is
 * pending the plugin host runtime. Until then the iframe shows a placeholder.
 *
 * Closes #248
 */

import { useEffect, useState } from 'react'
import { usePluginWidgetHtml } from './use-plugin-widget-html'

// ---------------------------------------------------------------------------
// Sidecar response
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export type PluginWidgetRendererProps = {
  /** Plugin identifier (e.g. "agentskit-demo-plugin"). */
  pluginId: string
  /** Full widget kind (e.g. "plugin:agentskit-demo-plugin:stub-hello"). */
  kind: string
  /** Arbitrary props forwarded to the plugin renderer. */
  props?: Record<string, unknown>
}

const PLACEHOLDER_HTML = `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body {
        margin: 0; padding: 12px;
        font-family: system-ui, sans-serif;
        font-size: 12px;
        color: #888;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        box-sizing: border-box;
      }
    </style>
  </head>
  <body>Plugin widget — host runtime pending (TODO #91/M5)</body>
</html>
`.trim()

export function PluginWidgetRenderer({
  pluginId,
  kind,
  props = {},
}: PluginWidgetRendererProps) {
  const [html, setHtml] = useState<string>(PLACEHOLDER_HTML)
  const [error, setError] = useState<string | null>(null)
  const getWidgetHtml = usePluginWidgetHtml()

  useEffect(() => {
    let cancelled = false

    async function fetchRender() {
      try {
        // TODO #91/M5 — sidecar plugin host: implement `plugins.widget.render`
        const rendered = await getWidgetHtml({ pluginId, kind, props })
        if (cancelled) return
        if (rendered.length > 0) setHtml(rendered)
        // else: no Tauri / no real response — placeholder remains
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    }

    void fetchRender()
    return () => {
      cancelled = true
    }
  }, [pluginId, kind, props, getWidgetHtml])

  if (error) {
    return (
      <div
        role="alert"
        className="flex h-full items-center justify-center p-2 text-xs text-[var(--ag-ink-subtle)]"
      >
        Plugin widget error: {error}
      </div>
    )
  }

  return (
    <iframe
      data-testid={`plugin-widget-${kind}`}
      title={`Plugin widget: ${kind}`}
      srcDoc={html}
      sandbox="allow-scripts"
      className="h-full w-full border-0"
      aria-label={`Plugin widget rendered by ${pluginId}`}
    />
  )
}
