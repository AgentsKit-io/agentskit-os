// Per #99 — agent cloning with variation. Pure: extends forkAgentConfig with
// a variation mutator (model swap, temperature delta, system-prompt suffix).

import type { AgentConfig } from '../schema/agent.js'
import { forkAgentConfig, type ForkOptions } from './fork.js'

export type CloneVariation = {
  readonly modelOverride?: string
  readonly temperatureDelta?: number
  /** Appended verbatim to the existing systemPrompt with a "Variation:" label. */
  readonly systemPromptSuffix?: string
  /** Tools removed from the clone. */
  readonly removeTools?: readonly string[]
  /** Tools added to the clone (deduped). */
  readonly addTools?: readonly string[]
  /** Tag added so dashboards can spot the variant. */
  readonly variantTag?: string
}

export type CloneVariationInput = ForkOptions & {
  readonly variation: CloneVariation
}

const clamp = (n: number, min: number, max: number): number => Math.max(min, Math.min(max, n))

/**
 * Fork an agent and apply a structured variation (#99). Returns a new
 * `AgentConfig`. Pure; persistence stays a caller concern.
 */
export const cloneAgentWithVariation = (
  source: AgentConfig,
  input: CloneVariationInput,
): AgentConfig => {
  const base = forkAgentConfig(source, input)
  const variation = input.variation

  const nextModel = variation.modelOverride !== undefined
    ? { ...base.model, model: variation.modelOverride }
    : base.model
  const nextTemperature = variation.temperatureDelta !== undefined && base.model.temperature !== undefined
    ? { ...nextModel, temperature: clamp(base.model.temperature + variation.temperatureDelta, 0, 2) }
    : nextModel
  const nextPrompt = variation.systemPromptSuffix !== undefined
    ? `${base.systemPrompt ?? ''}\n\nVariation: ${variation.systemPromptSuffix}`.trim()
    : base.systemPrompt

  const removed = new Set(variation.removeTools ?? [])
  const filtered = base.tools.filter((t) => !removed.has(t))
  const merged = variation.addTools !== undefined
    ? [...filtered, ...variation.addTools.filter((t) => !filtered.includes(t))]
    : filtered

  const variantTag = variation.variantTag ?? `variant:${input.newId}`
  const tags = base.tags.includes(variantTag) ? [...base.tags] : [...base.tags, variantTag]

  return {
    ...base,
    model: nextTemperature,
    ...(nextPrompt !== undefined ? { systemPrompt: nextPrompt } : {}),
    tools: merged,
    tags,
  }
}
