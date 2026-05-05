/**
 * CustomWidgetRenderer — polls a sidecar JSON-RPC method on an interval
 * and renders the resolved value according to the widget's display kind.
 *
 * Supported kinds:
 *   number    — large numeric display
 *   sparkline — row of small bars (last N values)
 *   gauge     — horizontal fill bar (0-100)
 *   text      — plain string value
 *
 * Path resolution uses `getPath()` — a minimal dot-notation getter that
 * avoids any external lodash dependency.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@agentskit/os-ui'
import { sidecarRequest } from '../../lib/sidecar'
import type { CustomWidget } from './custom-widget-types'

const toGaugeValue = (rawValue: unknown): number => {
  if (typeof rawValue === 'number') return rawValue
  const parsed = parseFloat(String(rawValue))
  return isNaN(parsed) ? 0 : parsed
}

const WidgetBody = (args: {
  kind: CustomWidget['kind']
  rawValue: unknown
  format: CustomWidget['format']
  sparkValues: number[]
  isLoading: boolean
  errorMsg: string | undefined
}): React.JSX.Element | null => {
  const { kind, rawValue, format, sparkValues, isLoading, errorMsg } = args

  if (isLoading) {
    return (
      <p className="text-sm text-[var(--ag-ink-subtle)]" aria-live="polite">
        Loading…
      </p>
    )
  }
  if (errorMsg) {
    return (
      <p className="text-xs text-red-500" role="alert" aria-live="polite">
        {errorMsg}
      </p>
    )
  }

  switch (kind) {
    case 'number':
      return (
        <p
          data-testid="custom-widget-value"
          className="text-3xl font-semibold tabular-nums text-[var(--ag-ink)]"
        >
          {formatValue(rawValue, format)}
        </p>
      )
    case 'sparkline':
      return (
        <div className="flex flex-col gap-2">
          <p
            data-testid="custom-widget-value"
            className="text-sm font-semibold tabular-nums text-[var(--ag-ink)]"
          >
            {formatValue(rawValue, format)}
          </p>
          <Sparkline values={sparkValues.length > 0 ? sparkValues : [0]} />
        </div>
      )
    case 'gauge': {
      const numVal = toGaugeValue(rawValue)
      return (
        <div className="flex flex-col gap-2">
          <p
            data-testid="custom-widget-value"
            className="text-sm font-semibold tabular-nums text-[var(--ag-ink)]"
          >
            {formatValue(rawValue, format)}
          </p>
          <Gauge value={numVal} />
        </div>
      )
    }
    case 'text':
      return (
        <p data-testid="custom-widget-value" className="text-sm text-[var(--ag-ink)]">
          {formatValue(rawValue, format)}
        </p>
      )
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Path resolution helper
// ---------------------------------------------------------------------------

/**
 * Resolve a dot-separated path within an object.
 * Returns `undefined` if any segment is missing.
 *
 * Examples:
 *   getPath({ a: { b: 3 } }, "a.b") → 3
 *   getPath({ a: 1 }, "a.b.c")      → undefined
 *   getPath({ a: 1 }, "")           → { a: 1 }  (empty path → root)
 */
export function getPath(obj: unknown, path: string): unknown {
  if (!path) return obj
  const segments = path.split('.')
  let current: unknown = obj
  for (const seg of segments) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[seg]
  }
  return current
}

// ---------------------------------------------------------------------------
// Format helper
// ---------------------------------------------------------------------------

function formatValue(
  raw: unknown,
  format: CustomWidget['format'],
): string {
  if (raw === null || raw === undefined) return '—'
  const { prefix = '', suffix = '', precision } = format ?? {}
  if (typeof raw === 'number') {
    const num = precision !== undefined ? raw.toFixed(precision) : String(raw)
    return `${prefix}${num}${suffix}`
  }
  return `${prefix}${String(raw)}${suffix}`
}

// ---------------------------------------------------------------------------
// Sparkline sub-component
// ---------------------------------------------------------------------------

const SPARKLINE_CAPACITY = 20

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1)
  return (
    <div
      data-testid="sparkline"
      className="flex h-10 items-end gap-0.5"
      aria-label="Sparkline chart"
    >
      {values.map((v, i) => (
        <div
          key={i}
          style={{ height: `${Math.round((v / max) * 100)}%` }}
          className="flex-1 rounded-sm bg-[var(--ag-accent)] opacity-80"
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Gauge sub-component (0-100)
// ---------------------------------------------------------------------------

function Gauge({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div
      data-testid="gauge"
      className="relative h-4 w-full overflow-hidden rounded-full bg-[var(--ag-panel-alt)]"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        style={{ width: `${pct}%` }}
        className="h-full rounded-full bg-[var(--ag-accent)] transition-[width] duration-300"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

type Props = {
  widget: CustomWidget
}

export function CustomWidgetRenderer({ widget }: Props) {
  const { title, kind, source, format } = widget
  const pollMs = source.pollMs ?? 5000

  const [rawValue, setRawValue] = useState<unknown>(undefined)
  const [sparkValues, setSparkValues] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | undefined>(undefined)

  const isMounted = useRef(true)
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const pushSparkValue = useCallback((value: number) => {
    setSparkValues((prev) => {
      const next = [...prev, value]
      if (next.length > SPARKLINE_CAPACITY) return next.slice(next.length - SPARKLINE_CAPACITY)
      return next
    })
  }, [])

  const fetchValue = useCallback(async () => {
    try {
      const response = await sidecarRequest(source.method)
      if (!isMounted.current) return
      const resolved = getPath(response, source.pathExpr ?? '')
      setRawValue(resolved)
      setErrorMsg(undefined)

      if (kind === 'sparkline' && typeof resolved === 'number') {
        pushSparkValue(resolved)
      }
    } catch (err) {
      if (!isMounted.current) return
      setErrorMsg(err instanceof Error ? err.message : 'Error fetching data')
    } finally {
      if (isMounted.current) setIsLoading(false)
    }
  }, [source.method, source.pathExpr, kind, pushSparkValue])

  useEffect(() => {
    void fetchValue()
    const interval = setInterval(() => void fetchValue(), pollMs)
    return () => clearInterval(interval)
  }, [pollMs, fetchValue])

  return (
    <Card className="h-full" data-testid={`custom-widget-${widget.id}`}>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-[var(--ag-ink-muted)]">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <WidgetBody
          kind={kind}
          rawValue={rawValue}
          format={format}
          sparkValues={sparkValues}
          isLoading={isLoading}
          errorMsg={errorMsg}
        />
      </CardContent>
    </Card>
  )
}
