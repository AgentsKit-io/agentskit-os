/**
 * Typed wrapper around the Tauri sidecar commands.
 *
 * `sidecar_request` — invoke a JSON-RPC method on the os-headless sidecar.
 * `sidecar_subscribe` — listen for broadcast events emitted by the sidecar.
 *
 * TODO(#38): expand method/params types once the full JSON-RPC surface is
 * defined in the headless runner spec.
 */

import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type JsonRpcParams = Record<string, unknown>

export type SidecarMethod =
  | 'health.ping'
  | 'runner.runFlow'
  | 'runner.runAgent'
  | 'runner.dispose'

export type SidecarRequest<P extends JsonRpcParams = JsonRpcParams> = {
  readonly method: SidecarMethod
  readonly params?: P
}

export type SidecarResponse<R = unknown> = {
  readonly ok: true
  readonly result: R
} | {
  readonly ok: false
  readonly error: string
}

export type SidecarEvent = {
  readonly method: string
  readonly params: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Request helper
// ---------------------------------------------------------------------------

/**
 * Send a JSON-RPC request to the os-headless sidecar.
 * Returns the typed result or throws with the JSON-RPC error message.
 */
export const sidecarRequest = async <R = unknown>(
  req: SidecarRequest,
): Promise<R> => {
  const response = await invoke<SidecarResponse<R>>('sidecar_request', {
    method: req.method,
    params: req.params ?? {},
  })

  if (!response.ok) {
    throw new Error(`sidecar: ${response.error}`)
  }

  return response.result
}

/**
 * Subscribe to broadcast events emitted by the sidecar over stdio.
 * Returns an unsubscribe function — call it on component unmount.
 */
export const subscribeEvents = async (
  handler: (event: SidecarEvent) => void,
): Promise<UnlistenFn> => {
  return listen<SidecarEvent>('sidecar://event', (e) => {
    handler(e.payload)
  })
}

/**
 * Convenience: ping the sidecar to confirm it is alive.
 * Resolves `true` on success, `false` on any error.
 */
export const pingSidecar = async (): Promise<boolean> => {
  try {
    await sidecarRequest({ method: 'health.ping' })
    return true
  } catch {
    return false
  }
}
