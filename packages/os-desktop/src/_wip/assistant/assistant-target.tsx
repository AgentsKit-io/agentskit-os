/**
 * AssistantTarget — helper component that adds `data-assist-target` and
 * `data-assist-kind` attributes to its child element so the AssistantProvider
 * can identify it when Cmd+I is pressed.
 *
 * Usage:
 *   <AssistantTarget id="node-42" kind="flow-node">
 *     <MyNode />
 *   </AssistantTarget>
 */

import { cloneElement, isValidElement } from 'react'
import type { AssistantTarget as AssistantTargetType } from './assistant-types'

export type AssistantTargetProps = {
  id: string
  kind: AssistantTargetType['kind']
  context?: Record<string, unknown>
  children: React.ReactElement
}

/**
 * Clones the single child element and injects assistant data attributes.
 * The child must be a single React element (not a fragment or array).
 */
export function AssistantTarget({ id, kind, children }: AssistantTargetProps): React.JSX.Element {
  if (!isValidElement(children)) {
    throw new Error('<AssistantTarget> requires a single React element as its child.')
  }
  return cloneElement(children as React.ReactElement<Record<string, unknown>>, {
    'data-assist-target': id,
    'data-assist-kind': kind,
  })
}
