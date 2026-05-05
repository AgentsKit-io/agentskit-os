import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { COST_BUDGETS_FIXTURE, useCostBudgets } from '../use-cost'

const mockSidecarRequest = vi.fn()

vi.mock('../../../lib/sidecar', () => ({
  sidecarRequest: (...args: unknown[]) => mockSidecarRequest(...args),
}))

describe('useCostBudgets', () => {
  beforeEach(() => {
    mockSidecarRequest.mockReset()
  })

  it('falls back to mock cost budgets when the dev sidecar returns a non-array payload', async () => {
    mockSidecarRequest.mockResolvedValue({})

    const { result } = renderHook(() => useCostBudgets())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.budgets).toEqual(COST_BUDGETS_FIXTURE)
    expect(result.current.error).toBeNull()
  })

  it('falls back to mock cost budgets when the sidecar rejects', async () => {
    mockSidecarRequest.mockRejectedValue(new Error('sidecar unavailable'))

    const { result } = renderHook(() => useCostBudgets())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.budgets).toEqual(COST_BUDGETS_FIXTURE)
    expect(result.current.error).toBe('sidecar unavailable')
  })
})
