import { describe, expect, it } from 'vitest'
import { runConformance } from '@agentskit/os-core'
import { BUILTIN_CODING_AGENT_IDS, createBuiltinCodingAgentProvider } from '../src/builtin.js'

const SHOULD_RUN = process.env.AK_RUN_CONFORMANCE_INTEGRATION === '1'

describe('os-coding-agents conformance (integration)', () => {
  it.skipIf(!SHOULD_RUN)('runs conformance against locally installed CLIs', async () => {
    const results: Array<{ id: string; certified: boolean }> = []

    for (const id of BUILTIN_CODING_AGENT_IDS) {
      const provider = createBuiltinCodingAgentProvider(id)
      const available = await provider.isAvailable()
      if (!available) {
        // Local machine may not have every CLI installed; treat as non-fatal.
        continue
      }
      const report = await runConformance(provider)
      results.push({ id, certified: report.certified })
    }

    // If at least one provider is installed, we should be able to certify it.
    if (results.length === 0) {
      expect(results.length).toBe(0)
      return
    }
    expect(results.some((r) => r.certified)).toBe(true)
  }, 120_000)
})

