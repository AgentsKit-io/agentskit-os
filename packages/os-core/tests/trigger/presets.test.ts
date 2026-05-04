import { describe, expect, it } from 'vitest'
import { getTriggerPreset, listTriggerPresets } from '../../src/trigger/presets.js'

describe('trigger presets', () => {
  it('lists presets with unique ids', () => {
    const ids = listTriggerPresets().map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('resolves a preset by id', () => {
    const p = getTriggerPreset('webhook/inbound-generic')
    expect(p?.trigger.kind).toBe('webhook')
  })

  it('includes discord webhook preset', () => {
    expect(getTriggerPreset('webhook/discord-inbound')?.trigger.kind).toBe('webhook')
  })
})
