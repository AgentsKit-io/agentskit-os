import { describe, expect, it } from 'vitest'
import { getDevTriggerPreset, listDevTriggerPresets, mapDevTriggerPresetToTaskInput } from '../src/dev-trigger-presets.js'

describe('DEV_TRIGGER_PRESETS (#369)', () => {
  it('lists presets with unique ids', () => {
    const presets = listDevTriggerPresets()
    expect(presets.length).toBeGreaterThanOrEqual(6)
    const ids = new Set(presets.map((p) => p.id))
    expect(ids.size).toBe(presets.length)
  })

  it('maps slack payload to prompt', () => {
    const preset = getDevTriggerPreset('slack/fix-issue-from-message')
    expect(preset).toBeDefined()
    const r = mapDevTriggerPresetToTaskInput({
      presetId: 'slack/fix-issue-from-message',
      payload: { event: { text: 'fix the failing test in x' } },
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.prompt).toContain('fix the failing test')
      expect(r.taskKind).toBe('fix-bug')
    }
  })

  it('returns error for unknown preset', () => {
    const r = mapDevTriggerPresetToTaskInput({ presetId: 'nope', payload: {} })
    expect(r.ok).toBe(false)
  })
})

