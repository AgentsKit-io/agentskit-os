/**
 * Tests for voice-types Zod schemas.
 */

import { describe, it, expect } from 'vitest'
import { VoiceStateSchema, VoiceTranscriptSchema } from '../voice-types'

// ---------------------------------------------------------------------------
// VoiceStateSchema
// ---------------------------------------------------------------------------

describe('VoiceStateSchema', () => {
  it('accepts all valid states', () => {
    for (const state of ['idle', 'listening', 'processing', 'error'] as const) {
      expect(VoiceStateSchema.parse(state)).toBe(state)
    }
  })

  it('rejects unknown states', () => {
    expect(() => VoiceStateSchema.parse('recording')).toThrow()
    expect(() => VoiceStateSchema.parse('')).toThrow()
    expect(() => VoiceStateSchema.parse(null)).toThrow()
  })
})

// ---------------------------------------------------------------------------
// VoiceTranscriptSchema
// ---------------------------------------------------------------------------

describe('VoiceTranscriptSchema', () => {
  const valid = {
    id: 'voice-1234',
    text: 'Hello world',
    finalized: true,
    startedAt: '2026-05-02T10:00:00.000Z',
  }

  it('parses a valid transcript', () => {
    const result = VoiceTranscriptSchema.parse(valid)
    expect(result.id).toBe('voice-1234')
    expect(result.text).toBe('Hello world')
    expect(result.finalized).toBe(true)
    expect(result.startedAt).toBe('2026-05-02T10:00:00.000Z')
  })

  it('parses an interim (non-finalized) transcript', () => {
    const result = VoiceTranscriptSchema.parse({ ...valid, finalized: false })
    expect(result.finalized).toBe(false)
  })

  it('rejects missing id', () => {
    const { id: _id, ...rest } = valid
    expect(() => VoiceTranscriptSchema.parse(rest)).toThrow()
  })

  it('rejects missing text', () => {
    const { text: _text, ...rest } = valid
    expect(() => VoiceTranscriptSchema.parse(rest)).toThrow()
  })

  it('rejects missing finalized', () => {
    const { finalized: _finalized, ...rest } = valid
    expect(() => VoiceTranscriptSchema.parse(rest)).toThrow()
  })

  it('rejects missing startedAt', () => {
    const { startedAt: _startedAt, ...rest } = valid
    expect(() => VoiceTranscriptSchema.parse(rest)).toThrow()
  })

  it('rejects non-boolean finalized', () => {
    expect(() => VoiceTranscriptSchema.parse({ ...valid, finalized: 'yes' })).toThrow()
  })
})
