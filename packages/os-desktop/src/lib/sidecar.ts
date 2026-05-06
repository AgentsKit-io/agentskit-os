/**
 * Sidecar IPC adapter — typed bridge between the React front-end and the
 * @agentskit/os-headless sidecar process (JSON-RPC 2.0 over stdio via Tauri).
 *
 * In a full Tauri build, these call `@tauri-apps/api` invoke() / listen().
 * In dev / web build (no Tauri runtime), they fall back to no-op stubs so
 * the UI keeps working without the sidecar.
 *
 * IPC contract (ADR-0018 §3.2):
 *   request  — front → sidecar (user-initiated actions)
 *   event    — sidecar → front (observability stream)
 *   audit    — sidecar → front (signed audit records)
 */

export type RunMode = 'real' | 'preview' | 'dry_run' | 'sandbox'

export type SidecarEvent = {
  /** ISO-8601 timestamp */
  readonly timestamp: string
  /** JSON-RPC method / event type, e.g. "run.started", "token.count" */
  readonly type: string
  /** Arbitrary JSON payload — consumers render a summary, not the raw blob */
  readonly data: Record<string, unknown>
}

export type SidecarStatus = 'connected' | 'disconnected' | 'error'

const hasTauri = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export async function sidecarRequest<T = unknown>(
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  if (!hasTauri()) {
    // Dev / web build — sidecar not available.
    return {} as T
  }
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<T>('sidecar_request', { method, params })
}

// ---------------------------------------------------------------------------
// Event subscription
// ---------------------------------------------------------------------------

export type UnsubscribeFn = () => void

export function subscribeEvents(onEvent: (event: SidecarEvent) => void): UnsubscribeFn {
  if (!hasTauri()) {
    void onEvent
    return () => undefined
  }
  let unlisten: (() => void) | undefined
  void import('@tauri-apps/api/event').then(({ listen }) => {
    listen<SidecarEvent>('sidecar://event', (e) => onEvent(e.payload)).then(
      (fn) => {
        unlisten = fn
      },
    )
  })
  return () => {
    unlisten?.()
  }
}

// ---------------------------------------------------------------------------
// Connection probe
// ---------------------------------------------------------------------------

export async function getSidecarStatus(): Promise<SidecarStatus> {
  if (!hasTauri()) return 'disconnected'
  return sidecarRequest<SidecarStatus>('sidecar_status').catch(() => 'error' as const)
}

// ---------------------------------------------------------------------------
// Runner control (D-3 tray menu)
// ---------------------------------------------------------------------------

/**
 * Pause all queued agent runs.
 * TODO(Refs #240): sidecar implementation of runner.pause is pending.
 */
export async function pauseRuns(): Promise<void> {
  await sidecarRequest('runner.pause', {})
}

/**
 * Resume paused agent runs.
 * TODO(Refs #240): sidecar implementation of runner.resume is pending.
 */
export async function resumeRuns(): Promise<void> {
  await sidecarRequest('runner.resume', {})
}

/**
 * Request cancellation of the flow run associated with a desktop trace (#199).
 * No-op in web/dev when Tauri is unavailable.
 */
export async function cancelRunForTrace(traceId: string): Promise<void> {
  await sidecarRequest('runner.cancelRun', { traceId })
}

/**
 * Ask the sidecar to dispose cleanly (flush audit events, close handles).
 * Called before the app exits via the tray Quit action.
 */
export async function disposeSidecar(): Promise<void> {
  await sidecarRequest('lifecycle.dispose', {})
}
