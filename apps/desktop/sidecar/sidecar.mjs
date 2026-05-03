#!/usr/bin/env node
/**
 * sidecar.mjs — thin Node.js sidecar shim for AgentsKitOS desktop.
 *
 * Serves JSON-RPC 2.0 over stdio.
 * - Reads newline-delimited JSON requests from stdin.
 * - Writes newline-delimited JSON responses/notifications to stdout.
 *
 * Methods exposed:
 *   health.ping          — liveness check
 *   runner.runFlow       — delegate to HeadlessRunner.runFlow
 *   runner.runAgent      — delegate to HeadlessRunner.runAgent
 *   runner.dispose       — flush audit + teardown
 *
 * Observability events from the runner are forwarded as JSON-RPC 2.0
 * notifications: { jsonrpc: "2.0", method: "event", params: {...} }
 *
 * TODO(#37): wire real WorkspaceConfig + AdapterRegistry once the desktop
 * workspace config UI (issue #44) ships and can supply credentials at runtime.
 * For now the runner is created in dry_run mode as a safe default.
 */

// @ts-check

import { createInterface } from 'node:readline'

// ---------------------------------------------------------------------------
// Import os-headless (will be available once pnpm packages are built).
// Gracefully degrade if the package hasn't been built yet.
// ---------------------------------------------------------------------------

/** @type {import('@agentskit/os-headless').HeadlessRunner | null} */
let runner = null

const tryInitRunner = async () => {
  try {
    const { createHeadlessRunner } = await import('@agentskit/os-headless')

    // Minimal stub adapters for the dry_run default mode.
    // TODO(#37): replace with real adapters injected from workspace config.
    /** @type {import('@agentskit/os-runtime').AdapterRegistry} */
    const stubAdapters = {
      llm: {
        complete: async (_req) => ({ content: '', usage: { inputTokens: 0, outputTokens: 0 } }),
      },
      tool: {
        execute: async (_req) => ({ output: null }),
      },
    }

    runner = createHeadlessRunner({
      config: {
        id: 'desktop-default',
        name: 'Desktop Default Workspace',
        version: '0.0.0',
      },
      adapters: stubAdapters,
    })
  } catch (err) {
    // Log to stderr only — stdout is reserved for JSON-RPC.
    process.stderr.write(`[sidecar] os-headless not available: ${err?.message ?? err}\n`)
  }
}

// ---------------------------------------------------------------------------
// JSON-RPC helpers
// ---------------------------------------------------------------------------

/**
 * @param {number | string} id
 * @param {unknown} result
 */
const respond = (id, result) => {
  const msg = JSON.stringify({ jsonrpc: '2.0', id, result })
  process.stdout.write(msg + '\n')
}

/**
 * @param {number | string} id
 * @param {number} code
 * @param {string} message
 */
const respondError = (id, code, message) => {
  const msg = JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } })
  process.stdout.write(msg + '\n')
}

/**
 * @param {string} method
 * @param {unknown} params
 */
const notify = (method, params) => {
  const msg = JSON.stringify({ jsonrpc: '2.0', method, params })
  process.stdout.write(msg + '\n')
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

/**
 * @param {{ id: number | string, method: string, params?: unknown }} req
 */
const dispatch = async (req) => {
  const { id, method, params } = req

  switch (method) {
    case 'health.ping': {
      respond(id, { pong: true, ts: Date.now() })
      break
    }

    case 'runner.runFlow': {
      if (!runner) {
        respondError(id, -32001, 'runner not initialized')
        break
      }
      try {
        const p = /** @type {Record<string, unknown>} */ (params ?? {})
        const result = await runner.runFlow(
          /** @type {string} */ (p['flowId']),
          {
            input: p['input'],
            mode: /** @type {import('@agentskit/os-core').RunMode | undefined} */ (p['mode']),
          },
        )
        notify('event', { type: 'flow.complete', runId: result.runId, status: result.status })
        respond(id, result)
      } catch (err) {
        respondError(id, -32000, err instanceof Error ? err.message : String(err))
      }
      break
    }

    case 'runner.runAgent': {
      if (!runner) {
        respondError(id, -32001, 'runner not initialized')
        break
      }
      try {
        const p = /** @type {Record<string, unknown>} */ (params ?? {})
        const result = await runner.runAgent(
          /** @type {string} */ (p['agentId']),
          p['input'],
          { mode: /** @type {import('@agentskit/os-core').RunMode | undefined} */ (p['mode']) },
        )
        respond(id, result)
      } catch (err) {
        respondError(id, -32000, err instanceof Error ? err.message : String(err))
      }
      break
    }

    case 'runner.dispose': {
      if (runner) {
        await runner.dispose()
        runner = null
      }
      respond(id, { disposed: true })
      break
    }

    default: {
      respondError(id, -32601, `Method not found: ${method}`)
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const main = async () => {
  await tryInitRunner()

  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity })

  rl.on('line', (line) => {
    const trimmed = line.trim()
    if (!trimmed) return

    /** @type {unknown} */
    let parsed
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      // Invalid JSON — write a parse error with null id.
      const msg = JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error' },
      })
      process.stdout.write(msg + '\n')
      return
    }

    const req = /** @type {{ id: number | string, method: string, params?: unknown }} */ (parsed)
    dispatch(req).catch((err) => {
      process.stderr.write(`[sidecar] unhandled dispatch error: ${err?.message ?? err}\n`)
    })
  })

  rl.on('close', () => {
    process.exit(0)
  })
}

main().catch((err) => {
  process.stderr.write(`[sidecar] fatal: ${err?.message ?? err}\n`)
  process.exit(1)
})
