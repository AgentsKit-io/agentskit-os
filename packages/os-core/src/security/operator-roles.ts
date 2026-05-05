/**
 * Role-based operator workspace primitives.
 *
 * Defines a small set of non-developer "operator" roles (clinician, account
 * manager, reviewer, operator) and the surfaces + actions each role is
 * allowed to see/perform. Reused by the desktop UI to hide developer
 * complexity (flow editor, agent registry, raw provider keys) and present
 * only forms/queues/approvals/dashboards/safe-actions/plain-language status.
 *
 * The schema is intentionally small + frozen: extending it is a
 * breaking-API change, not a configuration knob, so policy stays auditable.
 */

import { z } from 'zod'

export const OperatorRoleKind = z.enum([
  'clinician',
  'account-manager',
  'reviewer',
  'operator',
])
export type OperatorRoleKind = z.infer<typeof OperatorRoleKind>

export const OperatorScreen = z.enum([
  'home',
  'queues',
  'approvals',
  'dashboards',
  'forms',
  'status',
  'cost',
  'flows',
  'agents',
  'security',
  'evals',
  'benchmark',
  'triggers',
])
export type OperatorScreen = z.infer<typeof OperatorScreen>

export const OperatorAction = z.enum([
  'view-queue',
  'approve-task',
  'reject-task',
  'escalate-task',
  'submit-form',
  'pause-flow',
  'edit-flow',
  'edit-agent',
  'edit-policy',
  'export-data',
])
export type OperatorAction = z.infer<typeof OperatorAction>

type RolePolicy = {
  readonly screens: ReadonlySet<OperatorScreen>
  readonly actions: ReadonlySet<OperatorAction>
}

const policy = (
  screens: readonly OperatorScreen[],
  actions: readonly OperatorAction[],
): RolePolicy => ({
  screens: new Set(screens),
  actions: new Set(actions),
})

const ROLE_POLICIES: Readonly<Record<OperatorRoleKind, RolePolicy>> = {
  clinician: policy(
    ['home', 'queues', 'approvals', 'forms', 'status'],
    ['view-queue', 'approve-task', 'reject-task', 'escalate-task', 'submit-form'],
  ),
  'account-manager': policy(
    ['home', 'queues', 'dashboards', 'status', 'cost'],
    ['view-queue', 'submit-form', 'export-data'],
  ),
  reviewer: policy(
    ['home', 'queues', 'approvals', 'status'],
    ['view-queue', 'approve-task', 'reject-task', 'escalate-task'],
  ),
  operator: policy(
    ['home', 'queues', 'dashboards', 'status', 'cost', 'triggers'],
    ['view-queue', 'pause-flow', 'export-data'],
  ),
}

export const OperatorRoleAssignment = z.object({
  /** Stable subject id (user/install) — never an email or other PII. */
  subjectId: z.string().min(1).max(128),
  role: OperatorRoleKind,
  /** Optional hash of the operator's display name for UI personalization. */
  displayHash: z
    .string()
    .regex(/^[0-9a-f]{8,64}$/, { message: 'displayHash must be a hex digest' })
    .optional(),
})
export type OperatorRoleAssignment = z.infer<typeof OperatorRoleAssignment>

export const visibleScreensForRole = (role: OperatorRoleKind): readonly OperatorScreen[] =>
  [...ROLE_POLICIES[role].screens]

export const allowedActionsForRole = (role: OperatorRoleKind): readonly OperatorAction[] =>
  [...ROLE_POLICIES[role].actions]

export const canViewScreen = (role: OperatorRoleKind, screen: OperatorScreen): boolean =>
  ROLE_POLICIES[role].screens.has(screen)

export const canPerformAction = (role: OperatorRoleKind, action: OperatorAction): boolean =>
  ROLE_POLICIES[role].actions.has(action)

const DEVELOPER_SCREENS: ReadonlySet<OperatorScreen> = new Set<OperatorScreen>([
  'flows',
  'agents',
  'security',
  'evals',
  'benchmark',
])

/**
 * Return the developer surfaces hidden for a given role. Used by the desktop
 * shell to render an empty state with plain-language guidance instead of the
 * raw flow editor / agent registry / policy editor.
 */
export const hiddenScreensForRole = (role: OperatorRoleKind): readonly OperatorScreen[] => {
  const visible = ROLE_POLICIES[role].screens
  return [...DEVELOPER_SCREENS].filter((screen) => !visible.has(screen))
}

export const parseOperatorRoleAssignment = (input: unknown): OperatorRoleAssignment =>
  OperatorRoleAssignment.parse(input)
