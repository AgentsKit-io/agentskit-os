import { describe, expect, it } from 'vitest'
import { runUnderChaos } from '../src/chaos-harness.js'

const alwaysOne = (): number => 0.0

describe('runUnderChaos (#244)', () => {
  it('passes through with no rules', async () => {
    const out = await runUnderChaos(async () => 'ok', { rules: [] })
    expect(out.kind).toBe('ok')
    if (out.kind === 'ok') expect(out.value).toBe('ok')
  })

  it('fires throw fault when probability matches', async () => {
    const out = await runUnderChaos(async () => 'ok', {
      rules: [
        { id: 'boom', probability: 1, fault: { kind: 'throw', message: 'forced' } },
      ],
      rng: alwaysOne,
    })
    expect(out.kind).toBe('fault')
    if (out.kind === 'fault') {
      expect(out.error).toBe('forced')
      expect(out.faultsFired).toEqual(['boom'])
    }
  })

  it('skips rules whose tag does not match', async () => {
    const out = await runUnderChaos(async () => 'fine', {
      rules: [
        { id: 'tagged', probability: 1, matchTag: 'other', fault: { kind: 'throw' } },
      ],
      rng: alwaysOne,
    }, { tag: 'mine' })
    expect(out.kind).toBe('ok')
  })

  it('corrupt fault transforms the result', async () => {
    const out = await runUnderChaos(async () => ({ x: 1 }), {
      rules: [
        {
          id: 'twist',
          probability: 1,
          fault: { kind: 'corrupt', transform: () => ({ x: 99 }) },
        },
      ],
      rng: alwaysOne,
    })
    expect(out.kind).toBe('ok')
    if (out.kind === 'ok') expect((out.value as { x: number }).x).toBe(99)
  })

  it('captures native errors when no fault fires', async () => {
    const out = await runUnderChaos(async () => {
      throw new Error('native boom')
    }, { rules: [] })
    expect(out.kind).toBe('fault')
    if (out.kind === 'fault') {
      expect(out.ruleId).toBe('native')
      expect(out.error).toContain('native boom')
    }
  })
})
