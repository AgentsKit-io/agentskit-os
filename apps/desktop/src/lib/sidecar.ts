/**
 * Sidecar IPC adapter — typed bridge between the React front-end and the
 * @agentskit/os-headless sidecar process (JSON-RPC 2.0 over stdio via Tauri).
 *
 * In a full Tauri build, these call `@tauri-apps/api` invoke() / listen().
 * For now (web-only dev / test), they are stubbed to keep the build green
 * and the UI usable while the sidecar is not connected.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

/**
 * Send a typed JSON-RPC request to the sidecar.
 * Returns the result or throws on error.
 *
 * In the real Tauri desktop this delegates to `invoke('sidecar_request', ...)`.
 * In the web / vite dev build, it always resolves to a stub result.
 */
export async function sidecarRequest<T>(
  method: string,
  params?: Record<string, unknown>,
): Promise<T> {
  // TODO(tauri): replace with:
  //   const { invoke } = await import('@tauri-apps/api/core')
  //   return invoke<T>('sidecar_request', { method, params })
  void method
  void params
  return {} as T
}

// ---------------------------------------------------------------------------
// Event subscription
// ---------------------------------------------------------------------------

export type UnsubscribeFn = () => void

/**
 * Subscribe to the sidecar event stream.
 * Each call to `onEvent` receives one `SidecarEvent`.
 * Returns an unsubscribe function.
 *
 * In the real Tauri desktop this delegates to `listen('sidecar_event', ...)`.
 */
export function subscribeEvents(onEvent: (event: SidecarEvent) => void): UnsubscribeFn {
  // TODO(tauri): replace with:
  //   let unlisten: (() => void) | undefined
  //   import('@tauri-apps/api/event').then(({ listen }) => {
  //     listen<SidecarEvent>('sidecar_event', (e) => onEvent(e.payload)).then(
  //       (fn) => { unlisten = fn }
  //     )
  //   })
  //   return () => { unlisten?.() }
  void onEvent
  return () => {
    // no-op in web stub
  }
}

// ---------------------------------------------------------------------------
// Connection probe
// ---------------------------------------------------------------------------

/**
 * Returns the current sidecar connection status.
 * In the Tauri build this reads a Tauri store value set by Rust on sidecar
 * spawn / crash.  In the web stub it always returns 'disconnected'.
 */
export async function getSidecarStatus(): Promise<SidecarStatus> {
  // TODO(tauri): invoke('sidecar_status')
  return 'disconnected'
}
