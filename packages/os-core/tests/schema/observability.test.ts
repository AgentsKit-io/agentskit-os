import { describe, expect, it } from 'vitest'
import {
  parseObservabilityConfig,
  safeParseObservabilityConfig,
} from '../../src/schema/observability.js'

describe('ObservabilityConfig', () => {
  it('parses defaults from empty object', () => {
    const o = parseObservabilityConfig({})
    expect(o.enabled).toBe(true)
    expect(o.exporters).toEqual(['console'])
    expect(o.sampleRate).toBe(1)
    expect(o.redactInputs).toBe(false)
  })

  it('parses multi-exporter config with quotas', () => {
    const o = parseObservabilityConfig({
      exporters: ['langfuse', 'posthog'],
      apiKey: '${vault:posthog_key}',
      costQuota: { daily: 50, monthly: 1000, perAgent: { researcher: 10 } },
      anomalyDetection: { costSpikeMultiplier: 5, toolCallRateLimitPerMinute: 60 },
    })
    expect(o.exporters).toContain('langfuse')
    expect(o.costQuota?.daily).toBe(50)
  })

  it('rejects empty exporters array', () => {
    expect(safeParseObservabilityConfig({ exporters: [] }).success).toBe(false)
  })

  it('rejects unknown exporter', () => {
    expect(safeParseObservabilityConfig({ exporters: ['datadog'] }).success).toBe(false)
  })

  it('rejects sampleRate > 1', () => {
    expect(safeParseObservabilityConfig({ sampleRate: 2 }).success).toBe(false)
  })

  it('rejects negative cost quota', () => {
    expect(safeParseObservabilityConfig({ costQuota: { daily: -1 } }).success).toBe(false)
  })

  it('rejects malformed endpoint', () => {
    expect(safeParseObservabilityConfig({ endpoint: 'not-a-url' }).success).toBe(false)
  })

  it('rejects anomaly multiplier < 1', () => {
    expect(
      safeParseObservabilityConfig({ anomalyDetection: { costSpikeMultiplier: 0.5 } }).success,
    ).toBe(false)
  })
})
