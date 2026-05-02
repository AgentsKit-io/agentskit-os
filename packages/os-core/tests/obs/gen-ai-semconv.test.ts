import { describe, expect, it } from 'vitest'
import {
  GEN_AI_FINISH_REASONS,
  GEN_AI_OPERATION_NAMES,
  GenAiAttr,
  GenAiOperationName,
  SEMCONV_VERSION,
  buildRequestAttributes,
  buildResponseAttributes,
  parseGenAiAttributes,
  safeParseGenAiAttributes,
  spanName,
} from '../../src/obs/gen-ai-semconv.js'

describe('GenAiAttr', () => {
  it('exposes spec version', () => {
    expect(SEMCONV_VERSION).toBe('1.29.0')
  })

  it('all names start with gen_ai./server./error./agentskitos.', () => {
    for (const v of Object.values(GenAiAttr)) {
      expect(v).toMatch(/^(gen_ai\.|server\.|error\.|agentskitos\.)/)
    }
  })

  it.each(GEN_AI_OPERATION_NAMES)('parses operation %s', (op) => {
    expect(GenAiOperationName.safeParse(op).success).toBe(true)
  })

  it('rejects unknown operation', () => {
    expect(GenAiOperationName.safeParse('cosmic').success).toBe(false)
  })

  it('exposes all finish reasons', () => {
    expect(GEN_AI_FINISH_REASONS).toContain('stop')
    expect(GEN_AI_FINISH_REASONS).toContain('error')
  })
})

describe('GenAiSpanAttributes', () => {
  it('parses minimal bag', () => {
    const a = parseGenAiAttributes({
      'gen_ai.system': 'openai',
      'gen_ai.operation.name': 'chat',
      'gen_ai.request.model': 'gpt-4o',
    })
    expect(a['gen_ai.system']).toBe('openai')
  })

  it('rejects out-of-range temperature', () => {
    expect(safeParseGenAiAttributes({ 'gen_ai.request.temperature': 5 }).success).toBe(false)
  })

  it('rejects unknown finish reason', () => {
    expect(
      safeParseGenAiAttributes({ 'gen_ai.response.finish_reasons': ['cosmic'] }).success,
    ).toBe(false)
  })

  it('passes through extra non-genai attributes', () => {
    const a = parseGenAiAttributes({
      'gen_ai.system': 'anthropic',
      'http.request.method': 'POST',
    })
    expect((a as Record<string, unknown>)['http.request.method']).toBe('POST')
  })

  it('coerces bigint usage tokens to number', () => {
    const a = parseGenAiAttributes({ 'gen_ai.usage.input_tokens': BigInt(1234) })
    expect(a['gen_ai.usage.input_tokens']).toBe(1234)
  })
})

describe('spanName', () => {
  it('joins op + target', () => {
    expect(spanName('chat', 'gpt-4o')).toBe('chat gpt-4o')
  })

  it('falls back to op only', () => {
    expect(spanName('embedding')).toBe('embedding')
  })
})

describe('buildRequestAttributes', () => {
  it('builds minimal request', () => {
    const a = buildRequestAttributes({
      system: 'openai',
      operationName: 'chat',
      model: 'gpt-4o',
    })
    expect(a['gen_ai.operation.name']).toBe('chat')
  })

  it('includes optional params', () => {
    const a = buildRequestAttributes({
      system: 'anthropic',
      operationName: 'chat',
      model: 'claude-opus-4-7',
      temperature: 0.7,
      maxTokens: 2000,
      seed: 42,
    })
    expect(a['gen_ai.request.temperature']).toBe(0.7)
    expect(a['gen_ai.request.seed']).toBe(42)
  })

  it('omits undefined optional params', () => {
    const a = buildRequestAttributes({ system: 'openai', operationName: 'chat', model: 'gpt-4o' })
    expect('gen_ai.request.temperature' in a).toBe(false)
  })

  it('embeds OS run hints under agentskitos.* namespace', () => {
    const a = buildRequestAttributes(
      { system: 'openai', operationName: 'chat', model: 'gpt-4o' },
      { workspaceId: 'team-a', runMode: 'real', consentRefId: 'c_1', brandKitId: 'acme' },
    )
    expect(a['agentskitos.workspace_id']).toBe('team-a')
    expect(a['agentskitos.run_mode']).toBe('real')
    expect(a['agentskitos.consent_ref_id']).toBe('c_1')
    expect(a['agentskitos.brand_kit_id']).toBe('acme')
  })
})

describe('buildResponseAttributes', () => {
  it('builds with usage tokens + finish reasons', () => {
    const a = buildResponseAttributes({
      id: 'resp_1',
      finishReasons: ['stop'],
      inputTokens: 100,
      outputTokens: 250,
    })
    expect(a['gen_ai.usage.input_tokens']).toBe(100)
    expect(a['gen_ai.response.finish_reasons']).toEqual(['stop'])
  })

  it('embeds cost + cacheHit hints', () => {
    const a = buildResponseAttributes({}, { costUsd: 0.0042, cacheHit: true })
    expect(a['agentskitos.cost_usd']).toBe(0.0042)
    expect(a['agentskitos.cache_hit']).toBe(true)
  })

  it('omits undefined fields', () => {
    const a = buildResponseAttributes({})
    expect(Object.keys(a)).toEqual([])
  })
})
