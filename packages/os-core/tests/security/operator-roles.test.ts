import { describe, expect, it } from 'vitest'
import {
  allowedActionsForRole,
  canPerformAction,
  canViewScreen,
  hiddenScreensForRole,
  parseOperatorRoleAssignment,
  visibleScreensForRole,
} from '../../src/security/operator-roles.js'

describe('operator role policies', () => {
  it('clinician can view approvals + queues + forms but not flows', () => {
    expect(canViewScreen('clinician', 'approvals')).toBe(true)
    expect(canViewScreen('clinician', 'queues')).toBe(true)
    expect(canViewScreen('clinician', 'forms')).toBe(true)
    expect(canViewScreen('clinician', 'flows')).toBe(false)
    expect(canViewScreen('clinician', 'agents')).toBe(false)
  })

  it('reviewer can approve/reject/escalate but cannot edit flows', () => {
    expect(canPerformAction('reviewer', 'approve-task')).toBe(true)
    expect(canPerformAction('reviewer', 'reject-task')).toBe(true)
    expect(canPerformAction('reviewer', 'escalate-task')).toBe(true)
    expect(canPerformAction('reviewer', 'edit-flow')).toBe(false)
    expect(canPerformAction('reviewer', 'edit-agent')).toBe(false)
  })

  it('account manager can view dashboards + cost and export data', () => {
    expect(canViewScreen('account-manager', 'dashboards')).toBe(true)
    expect(canViewScreen('account-manager', 'cost')).toBe(true)
    expect(canPerformAction('account-manager', 'export-data')).toBe(true)
    expect(canPerformAction('account-manager', 'approve-task')).toBe(false)
  })

  it('operator can pause flows but cannot edit them', () => {
    expect(canPerformAction('operator', 'pause-flow')).toBe(true)
    expect(canPerformAction('operator', 'edit-flow')).toBe(false)
    expect(canPerformAction('operator', 'edit-policy')).toBe(false)
  })

  it.each(['clinician', 'account-manager', 'reviewer', 'operator'] as const)(
    'never exposes developer screens to %s',
    (role) => {
      const developerScreens = ['flows', 'agents', 'security', 'evals', 'benchmark'] as const
      for (const screen of developerScreens) {
        expect(canViewScreen(role, screen)).toBe(false)
      }
    },
  )

  it('hiddenScreensForRole returns the developer surfaces hidden by the policy', () => {
    expect(hiddenScreensForRole('reviewer')).toEqual(
      expect.arrayContaining(['flows', 'agents', 'security', 'evals', 'benchmark']),
    )
  })

  it('exposes the screens whitelist for the role as a readable list', () => {
    expect(visibleScreensForRole('clinician')).toEqual(
      expect.arrayContaining(['home', 'queues', 'approvals', 'forms', 'status']),
    )
  })

  it('exposes the actions whitelist for the role as a readable list', () => {
    expect(allowedActionsForRole('reviewer')).toEqual(
      expect.arrayContaining([
        'view-queue',
        'approve-task',
        'reject-task',
        'escalate-task',
      ]),
    )
  })
})

describe('parseOperatorRoleAssignment', () => {
  it('accepts a minimal assignment', () => {
    const assignment = parseOperatorRoleAssignment({
      subjectId: 'subject-1',
      role: 'clinician',
    })
    expect(assignment.role).toBe('clinician')
  })

  it('rejects unknown roles', () => {
    expect(() =>
      parseOperatorRoleAssignment({
        subjectId: 'subject-1',
        role: 'admin',
      }),
    ).toThrow()
  })

  it('rejects non-hex displayHash values', () => {
    expect(() =>
      parseOperatorRoleAssignment({
        subjectId: 'subject-1',
        role: 'clinician',
        displayHash: 'Plaintext Name',
      }),
    ).toThrow()
  })
})
