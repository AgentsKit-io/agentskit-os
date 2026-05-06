import { describe, expect, it } from 'vitest'
import {
  filterForPrivateViewer,
  tagPrivateScope,
  type MarketplaceListing,
} from '../src/index.js'

const HASH = 'a'.repeat(64)

const listing = (id: string, tags: readonly string[]): MarketplaceListing => ({
  id,
  name: id,
  description: '',
  author: 'rebeca',
  version: '1.0.0',
  category: 'templates',
  tags,
  rating: 4,
  ratingCount: 1,
  installCount: 0,
  publishedAt: '2026-05-06T00:00:00Z',
  updatedAt: '2026-05-06T00:00:00Z',
  integrityHash: HASH,
})

describe('filterForPrivateViewer (#173)', () => {
  it('public listings always pass', () => {
    const r = filterForPrivateViewer([listing('a', [])], {
      userId: 'u', teamIds: [], orgIds: [], workspaceIds: [],
    })
    expect(r).toHaveLength(1)
  })

  it('private listing visible only to matching team', () => {
    const items = [
      listing('public-1', []),
      listing('team-only', ['private', 'team:platform']),
      listing('other-team', ['private', 'team:growth']),
    ]
    const r = filterForPrivateViewer(items, {
      userId: 'u', teamIds: ['platform'], orgIds: [], workspaceIds: [],
    })
    expect(r.map((l) => l.id)).toEqual(['public-1', 'team-only'])
  })
})

describe('tagPrivateScope (#173)', () => {
  it('adds private + team prefix tags', () => {
    expect(tagPrivateScope(['existing'], { teamId: 'platform' }))
      .toEqual(['existing', 'private', 'team:platform'])
  })

  it('combines team + org + workspace scopes', () => {
    const tags = tagPrivateScope([], { teamId: 't', orgId: 'o', workspaceId: 'w' })
    expect(tags).toEqual(['org:o', 'private', 'team:t', 'workspace:w'])
  })
})
