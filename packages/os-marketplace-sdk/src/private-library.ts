// Per #173 — private team template library.
// Pure: scoping rules + filter helper for templates that should only appear
// to members of a specific team / org. Storage stays a caller concern.

import type { MarketplaceListing } from './listing.js'

export type PrivateScope = {
  /** Team id; matches a `team:<id>` tag on the listing. */
  readonly teamId?: string
  /** Org id; matches an `org:<id>` tag on the listing. */
  readonly orgId?: string
  /** Workspace id; matches a `workspace:<id>` tag on the listing. */
  readonly workspaceId?: string
}

export type PrivateLibraryViewer = {
  readonly userId: string
  readonly teamIds: readonly string[]
  readonly orgIds: readonly string[]
  readonly workspaceIds: readonly string[]
}

const PRIVATE_PREFIX = 'private:'
const TEAM_PREFIX = 'team:'
const ORG_PREFIX = 'org:'
const WORKSPACE_PREFIX = 'workspace:'

const isPrivate = (l: MarketplaceListing): boolean =>
  l.tags.some((t) => t === 'private' || t.startsWith(PRIVATE_PREFIX))

const matchesViewer = (l: MarketplaceListing, viewer: PrivateLibraryViewer): boolean => {
  for (const tag of l.tags) {
    if (tag.startsWith(TEAM_PREFIX) && viewer.teamIds.includes(tag.slice(TEAM_PREFIX.length))) return true
    if (tag.startsWith(ORG_PREFIX) && viewer.orgIds.includes(tag.slice(ORG_PREFIX.length))) return true
    if (tag.startsWith(WORKSPACE_PREFIX) && viewer.workspaceIds.includes(tag.slice(WORKSPACE_PREFIX.length))) return true
  }
  return false
}

/**
 * Filter listings against a private-library viewer (#173). Public listings
 * (no `private` tag) pass through untouched; private listings only appear
 * when the viewer is a member of the matching team / org / workspace.
 */
export const filterForPrivateViewer = (
  listings: readonly MarketplaceListing[],
  viewer: PrivateLibraryViewer,
): readonly MarketplaceListing[] =>
  listings.filter((l) => !isPrivate(l) || matchesViewer(l, viewer))

/** Tag a listing as private and bind it to a scope (#173). */
export const tagPrivateScope = (
  base: readonly string[],
  scope: PrivateScope,
): readonly string[] => {
  const next = new Set(base)
  next.add('private')
  if (scope.teamId !== undefined) next.add(`${TEAM_PREFIX}${scope.teamId}`)
  if (scope.orgId !== undefined) next.add(`${ORG_PREFIX}${scope.orgId}`)
  if (scope.workspaceId !== undefined) next.add(`${WORKSPACE_PREFIX}${scope.workspaceId}`)
  return [...next].sort()
}
