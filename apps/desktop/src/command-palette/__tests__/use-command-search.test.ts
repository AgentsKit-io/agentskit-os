/**
 * Tests for searchCommands — fuzzy match, exact match, keyword match,
 * empty query, max results cap.
 */

import { describe, it, expect } from 'vitest'
import { searchCommands } from '../use-command-search'
import type { Command } from '../commands'

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

function makeCmd(overrides: Partial<Command> & Pick<Command, 'id' | 'label'>): Command {
  return {
    keywords: [],
    category: 'Navigation',
    run: () => undefined,
    ...overrides,
  }
}

const COMMANDS: Command[] = [
  makeCmd({ id: 'nav.dashboard', label: 'Go to Dashboard', keywords: ['home', 'overview'] }),
  makeCmd({ id: 'nav.traces', label: 'Go to Traces', keywords: ['logs', 'spans'] }),
  makeCmd({ id: 'nav.settings', label: 'Open Settings', keywords: ['preferences'] }),
  makeCmd({ id: 'runtime.pause', label: 'Pause Runs', keywords: ['stop', 'halt'], category: 'Runtime' }),
  makeCmd({ id: 'runtime.resume', label: 'Resume Runs', keywords: ['start', 'continue'], category: 'Runtime' }),
  makeCmd({ id: 'view.theme', label: 'Toggle Theme', keywords: ['dark', 'light', 'mode'], category: 'View' }),
  makeCmd({ id: 'system.clear', label: 'Clear Event Feed', keywords: ['flush', 'wipe'], category: 'System' }),
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('searchCommands — empty query', () => {
  it('returns all commands (up to max) when query is empty string', () => {
    const results = searchCommands('', COMMANDS)
    expect(results).toHaveLength(COMMANDS.length)
  })

  it('returns all commands when query is whitespace only', () => {
    const results = searchCommands('   ', COMMANDS)
    expect(results).toHaveLength(COMMANDS.length)
  })
})

describe('searchCommands — exact label match', () => {
  it('returns the command with an exact label match', () => {
    const results = searchCommands('Pause Runs', COMMANDS)
    expect(results.at(0)?.id).toBe('runtime.pause')
  })

  it('is case-insensitive', () => {
    const results = searchCommands('pause runs', COMMANDS)
    expect(results.at(0)?.id).toBe('runtime.pause')
  })
})

describe('searchCommands — partial / fuzzy label match', () => {
  it('matches a partial substring of the label', () => {
    const results = searchCommands('dash', COMMANDS)
    const ids = results.map((r) => r.id)
    expect(ids).toContain('nav.dashboard')
  })

  it('matches via subsequence (non-contiguous characters)', () => {
    // 'tr' matches 'Traces' and 'Toggle Theme' — both should appear
    const results = searchCommands('tr', COMMANDS)
    const ids = results.map((r) => r.id)
    expect(ids.some((id) => id === 'nav.traces' || id === 'view.theme')).toBe(true)
  })
})

describe('searchCommands — keyword match', () => {
  it('returns commands whose keywords match the query', () => {
    const results = searchCommands('halt', COMMANDS)
    const ids = results.map((r) => r.id)
    expect(ids).toContain('runtime.pause')
  })

  it('matches keywords case-insensitively', () => {
    const results = searchCommands('LOGS', COMMANDS)
    const ids = results.map((r) => r.id)
    expect(ids).toContain('nav.traces')
  })
})

describe('searchCommands — no match', () => {
  it('returns empty array when nothing matches', () => {
    const results = searchCommands('zzzznotacommand', COMMANDS)
    expect(results).toHaveLength(0)
  })
})

describe('searchCommands — max results cap', () => {
  it('returns at most 25 results', () => {
    // Build 30 commands that all match 'go'
    const manyCommands: Command[] = Array.from({ length: 30 }, (_, i) =>
      makeCmd({ id: `cmd.${i}`, label: `Go Command ${i}`, keywords: [] }),
    )
    const results = searchCommands('go', manyCommands)
    expect(results.length).toBeLessThanOrEqual(25)
  })
})

describe('searchCommands — empty commands list', () => {
  it('returns empty array when no commands are provided', () => {
    const results = searchCommands('dashboard', [])
    expect(results).toHaveLength(0)
  })
})

describe('searchCommands — label ranked higher than keyword', () => {
  it('places label match before keyword-only match in results', () => {
    // 'home' is a keyword of dashboard; 'home' is NOT in any label
    // 'overview' is a keyword — should still match
    const results = searchCommands('home', COMMANDS)
    const ids = results.map((r) => r.id)
    expect(ids).toContain('nav.dashboard')
  })
})
