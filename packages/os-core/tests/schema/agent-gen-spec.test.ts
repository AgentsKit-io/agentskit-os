import { describe, expect, it } from 'vitest'
import { extractAgentGenSpec } from '../../src/index.js'

describe('extractAgentGenSpec (#91)', () => {
  it('detects pipeline + trigger + tool hints in a multi-clause brief', () => {
    const spec = extractAgentGenSpec(
      'Build a pipeline that runs every hour, fetches GitHub PRs, then notifies Slack with a summary.',
    )
    expect(spec.intent).toBe('mixed')
    expect(spec.triggerHints).toContain('github')
    expect(spec.triggerHints).toContain('slack')
    expect(spec.triggerHints).toContain('pr')
  })

  it('returns intent=trigger when only a schedule is mentioned', () => {
    const spec = extractAgentGenSpec('Trigger every day at 9am.')
    expect(spec.intent).toBe('trigger')
  })

  it('detects domain tags', () => {
    const spec = extractAgentGenSpec('Generate a marketing campaign brief weekly.')
    expect(spec.domainTags).toContain('marketing')
  })

  it('produces a deterministic suggestedSlug', () => {
    const a = extractAgentGenSpec('Hello, World 123!')
    const b = extractAgentGenSpec('hello world 123')
    expect(a.suggestedSlug).toBe('hello-world-123')
    expect(b.suggestedSlug).toBe('hello-world-123')
  })
})
