// Live debugger control plane for os-flow.
// Pure in-memory primitives: breakpoints, mock injection, and step/resume state.

import { z } from 'zod'
import type { FlowNode, RunContext } from '@agentskit/os-core'
import type { NodeOutcome } from './handlers.js'

export type NodeId = string

export const DebuggerMode = z.enum(['run', 'paused', 'step'])
export type DebuggerMode = z.infer<typeof DebuggerMode>

export const DebuggerState = z.object({
  mode: DebuggerMode,
  breakpoints: z.array(z.string()),
  mocks: z.array(z.tuple([z.string(), z.unknown()])),
})
export type DebuggerState = z.infer<typeof DebuggerState>

export type DebuggerBeforeNodeInput = {
  readonly node: FlowNode
  readonly ctx: RunContext
}

export type DebuggerBeforeNodeDecision =
  | { readonly kind: 'continue' }
  | { readonly kind: 'pause'; readonly reason: 'breakpoint' | 'manual' | 'step' }
  | { readonly kind: 'mock'; readonly outcome: NodeOutcome }

export type DebuggerAfterNodeInput = {
  readonly node: FlowNode
  readonly ctx: RunContext
  readonly outcome: NodeOutcome
}

export interface FlowDebugger {
  setBreakpoints(ids: ReadonlyArray<NodeId>): void
  setMock(id: NodeId, outcome: NodeOutcome): void
  clearMock(id: NodeId): void
  pause(): void
  step(): void
  resume(): void
  state(): DebuggerState
  beforeNode(input: DebuggerBeforeNodeInput): Promise<DebuggerBeforeNodeDecision>
  afterNode(input: DebuggerAfterNodeInput): void
}

export const createInMemoryDebugger = (): FlowDebugger => {
  let mode: DebuggerMode = 'run'
  let pausedReason: 'breakpoint' | 'manual' | 'step' = 'manual'
  const breakpoints = new Set<NodeId>()
  const mocks = new Map<NodeId, NodeOutcome>()

  return {
    setBreakpoints(ids) {
      breakpoints.clear()
      for (const id of ids) breakpoints.add(id)
    },
    setMock(id, outcome) {
      mocks.set(id, outcome)
    },
    clearMock(id) {
      mocks.delete(id)
    },
    pause() {
      mode = 'paused'
      pausedReason = 'manual'
    },
    step() {
      mode = 'step'
    },
    resume() {
      mode = 'run'
    },
    state() {
      return DebuggerState.parse({
        mode,
        breakpoints: [...breakpoints],
        mocks: [...mocks.entries()],
      })
    },
    async beforeNode({ node }) {
      const mock = mocks.get(node.id)
      if (mock) return { kind: 'mock', outcome: mock }

      if (mode === 'paused') return { kind: 'pause', reason: pausedReason }
      if (mode !== 'step' && breakpoints.has(node.id)) {
        mode = 'paused'
        pausedReason = 'breakpoint'
        return { kind: 'pause', reason: pausedReason }
      }
      return { kind: 'continue' }
    },
    afterNode() {
      if (mode === 'step') {
        mode = 'paused'
        pausedReason = 'step'
      }
    },
  }
}

