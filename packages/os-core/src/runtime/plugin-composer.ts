// Per #96 — plugin extensibility composer.
// Pure: groups a plugin's contributions by surface (UI / triggers / dashboards
// / tools / observability) so the host runtime mounts each into the right
// registry in a single pass. Built on top of #83 PluginConfig.

import type { PluginConfig, PluginContribution, ResolvedPluginEntry } from '../schema/plugin.js'
import { resolvePluginEntries } from '../schema/plugin.js'

export type PluginSurfaceGroups = {
  readonly ui: readonly ResolvedPluginEntry[]
  readonly triggers: readonly ResolvedPluginEntry[]
  readonly dashboards: readonly ResolvedPluginEntry[]
  readonly tools: readonly ResolvedPluginEntry[]
  readonly observability: readonly ResolvedPluginEntry[]
  readonly skills: readonly ResolvedPluginEntry[]
  readonly memory: readonly ResolvedPluginEntry[]
}

const isUi = (c: PluginContribution): boolean => c === 'ui-panel' || c === 'ui-widget'
const isTrigger = (c: PluginContribution): boolean => c === 'trigger'
const isObservability = (c: PluginContribution): boolean => c === 'observability'
const isTool = (c: PluginContribution): boolean => c === 'tool'
const isSkill = (c: PluginContribution): boolean => c === 'skill'
const isMemory = (c: PluginContribution): boolean => c === 'memory'

/**
 * Group resolved plugin entries by surface (#96). Dashboard widgets are a
 * thin alias over ui-widget — same primitive, dashboard slot.
 */
export const composePluginSurfaces = (config: PluginConfig): PluginSurfaceGroups => {
  const entries = resolvePluginEntries(config)
  const ui = entries.filter((e) => isUi(e.contribution))
  const dashboards = entries.filter((e) => e.contribution === 'ui-widget' && e.uiSlot === 'dashboard')
  return {
    ui,
    triggers: entries.filter((e) => isTrigger(e.contribution)),
    dashboards,
    tools: entries.filter((e) => isTool(e.contribution)),
    observability: entries.filter((e) => isObservability(e.contribution)),
    skills: entries.filter((e) => isSkill(e.contribution)),
    memory: entries.filter((e) => isMemory(e.contribution)),
  }
}

export type SurfaceMountPlan =
  | { readonly kind: 'mount'; readonly surface: keyof PluginSurfaceGroups; readonly entry: ResolvedPluginEntry }
  | { readonly kind: 'skip'; readonly surface: keyof PluginSurfaceGroups; readonly entry: ResolvedPluginEntry; readonly reason: string }

/**
 * Produce a per-entry mount plan (#96). Skips ui/dashboard entries that
 * don't declare an entryPoint and trigger entries with no uiSlot mismatch
 * left for the host to fold into structured logs.
 */
export const planPluginMount = (config: PluginConfig): readonly SurfaceMountPlan[] => {
  const groups = composePluginSurfaces(config)
  const plans: SurfaceMountPlan[] = []
  for (const [surface, entries] of Object.entries(groups) as [keyof PluginSurfaceGroups, readonly ResolvedPluginEntry[]][]) {
    for (const entry of entries) {
      if ((surface === 'ui' || surface === 'dashboards') && entry.entryPoint === undefined) {
        plans.push({ kind: 'skip', surface, entry, reason: 'ui contribution missing entryPoint' })
        continue
      }
      plans.push({ kind: 'mount', surface, entry })
    }
  }
  return plans
}
