import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDeployToCloud } from '../use-deploy-to-cloud'

vi.mock('../../../lib/sidecar', () => ({
  sidecarRequest: vi.fn(async () => ({ status: 'queued' })),
}))

import { sidecarRequest } from '../../../lib/sidecar'

describe('useDeployToCloud', () => {
  beforeEach(() => {
    vi.mocked(sidecarRequest).mockClear()
  })

  it('invokes sidecar cloud.deploy with the supplied mode and label', async () => {
    const { result } = renderHook(() => useDeployToCloud())
    await result.current({ mode: 'preview', label: 'staging' })

    expect(sidecarRequest).toHaveBeenCalledWith('cloud.deploy', {
      mode: 'preview',
      label: 'staging',
    })
  })

  it('forwards real run mode for production deploys', async () => {
    const { result } = renderHook(() => useDeployToCloud())
    await result.current({ mode: 'real', label: 'prod' })

    expect(sidecarRequest).toHaveBeenCalledWith('cloud.deploy', {
      mode: 'real',
      label: 'prod',
    })
  })
})
