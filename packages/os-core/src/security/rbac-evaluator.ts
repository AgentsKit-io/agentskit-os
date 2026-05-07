// Per #128 — team seats + granular RBAC.
// Pure: map RbacRole → allowed actions; evaluator returns a verdict for a
// (seat, action, resource-tag) tuple the runtime calls before any mutation.

import type { RbacRole, TeamSeat } from '../schema/cloud.js'

export type RbacAction =
  | 'workspace.read'
  | 'workspace.write'
  | 'workspace.delete'
  | 'agent.create'
  | 'agent.update'
  | 'agent.delete'
  | 'flow.run'
  | 'flow.publish'
  | 'plugin.install'
  | 'billing.manage'
  | 'team.invite'

const VIEWER_ACTIONS: readonly RbacAction[] = ['workspace.read']

const EDITOR_ACTIONS: readonly RbacAction[] = [
  ...VIEWER_ACTIONS,
  'workspace.write',
  'agent.create',
  'agent.update',
  'flow.run',
  'flow.publish',
]

const ADMIN_ACTIONS: readonly RbacAction[] = [
  ...EDITOR_ACTIONS,
  'workspace.delete',
  'agent.delete',
  'plugin.install',
  'team.invite',
]

const OWNER_ACTIONS: readonly RbacAction[] = [...ADMIN_ACTIONS, 'billing.manage']

const ROLE_ALLOWS: Readonly<Record<RbacRole, ReadonlySet<RbacAction>>> = {
  viewer: new Set(VIEWER_ACTIONS),
  editor: new Set(EDITOR_ACTIONS),
  admin: new Set(ADMIN_ACTIONS),
  owner: new Set(OWNER_ACTIONS),
}

export type RbacVerdict =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: 'role_lacks_action' | 'seat_not_found' }

/**
 * Evaluate whether a team seat may perform an action (#128). Pure; returns
 * `seat_not_found` when no seat matches the email so callers can log denials.
 */
export const evaluateRbac = (
  seats: readonly TeamSeat[],
  args: { readonly email: string; readonly action: RbacAction },
): RbacVerdict => {
  const seat = seats.find((s) => s.email.toLowerCase() === args.email.toLowerCase())
  if (seat === undefined) return { allowed: false, reason: 'seat_not_found' }
  const set = ROLE_ALLOWS[seat.role]
  if (!set.has(args.action)) return { allowed: false, reason: 'role_lacks_action' }
  return { allowed: true }
}

/** Return every action a role permits (#128). */
export const allowedActionsFor = (role: RbacRole): readonly RbacAction[] =>
  [...ROLE_ALLOWS[role]].sort()
