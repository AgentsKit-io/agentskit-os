import type { FlowEdge } from '@agentskit/os-core'
import type { NodeOutcome } from './handlers.js'

export const edgeMatches = (
  on: FlowEdge['on'],
  outcome: NodeOutcome,
): boolean => {
  switch (on) {
    case 'always':
      return true
    case 'success':
      return outcome.kind === 'ok' || outcome.kind === 'skipped'
    case 'failure':
      return outcome.kind === 'failed'
    case 'true':
      return outcome.kind === 'ok' && outcome.value === true
    case 'false':
      return outcome.kind === 'ok' && outcome.value === false
  }
}

