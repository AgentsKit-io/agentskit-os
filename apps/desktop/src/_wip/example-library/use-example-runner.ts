/**
 * useExampleRunner — triggers scaffolding of an example via the sidecar.
 *
 * Calls `sidecarRequest('templates.scaffoldFrom', { templateId, exampleId })`
 * (sidecar implementation tracked in TODO #91) and exposes a simple
 * `{ run, isRunning, workspacePath, error }` surface to the UI.
 */

import { useCallback, useState } from 'react'
import { sidecarRequest } from '../lib/sidecar'

type ScaffoldResult = {
  readonly workspacePath: string
}

type UseExampleRunnerReturn = {
  /** Call to scaffold the example. No-op when templateId is null. */
  run: (templateId: string | null, exampleId: string) => Promise<void>
  /** True while the sidecar request is in-flight. */
  isRunning: boolean
  /** Path returned by the sidecar after successful scaffolding. */
  workspacePath: string | null
  /** Error message if the last run failed. */
  error: string | null
  /** Reset state back to idle. */
  reset: () => void
}

export function useExampleRunner(): UseExampleRunnerReturn {
  const [isRunning, setIsRunning] = useState(false)
  const [workspacePath, setWorkspacePath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async (templateId: string | null, exampleId: string) => {
    if (templateId === null) return
    setIsRunning(true)
    setError(null)
    setWorkspacePath(null)

    try {
      const result = await sidecarRequest<ScaffoldResult>('templates.scaffoldFrom', {
        templateId,
        exampleId,
      })
      setWorkspacePath(result.workspacePath ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsRunning(false)
    }
  }, [])

  const reset = useCallback(() => {
    setIsRunning(false)
    setWorkspacePath(null)
    setError(null)
  }, [])

  return { run, isRunning, workspacePath, error, reset }
}
