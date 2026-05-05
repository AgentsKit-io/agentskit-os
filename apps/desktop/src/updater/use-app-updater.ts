import { useCallback, useEffect, useState } from 'react'
import { sidecarRequest } from '../lib/sidecar'

export type UpdateStatus =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'available'; version: string; notes: string | undefined }
  | { kind: 'downloading'; version: string; progress: number }
  | { kind: 'ready'; version: string }
  | { kind: 'installed'; version: string }
  | { kind: 'rolled-back'; previousVersion: string }
  | { kind: 'error'; message: string }
  | { kind: 'up-to-date' }

export type CheckResponse = {
  readonly hasUpdate: boolean
  readonly version?: string
  readonly notes?: string
}

export type DownloadResponse = {
  readonly version: string
  readonly progress: number
  readonly done: boolean
}

export type InstallResponse = {
  readonly version: string
}

export type RollbackResponse = {
  readonly previousVersion: string
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isCheckResponse = (value: unknown): value is CheckResponse => {
  if (!isObject(value)) return false
  return typeof value['hasUpdate'] === 'boolean'
}

const isDownloadResponse = (value: unknown): value is DownloadResponse => {
  if (!isObject(value)) return false
  return typeof value['version'] === 'string' && typeof value['progress'] === 'number'
}

const isInstallResponse = (value: unknown): value is InstallResponse => {
  if (!isObject(value)) return false
  return typeof value['version'] === 'string'
}

const isRollbackResponse = (value: unknown): value is RollbackResponse => {
  if (!isObject(value)) return false
  return typeof value['previousVersion'] === 'string'
}

const errorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return 'unknown error'
}

const requestCheck = (): Promise<CheckResponse> =>
  sidecarRequest<CheckResponse>('app.update.check')

const requestDownload = (): Promise<DownloadResponse> =>
  sidecarRequest<DownloadResponse>('app.update.download')

const requestInstall = (): Promise<InstallResponse> =>
  sidecarRequest<InstallResponse>('app.update.install')

const requestRollback = (): Promise<RollbackResponse> =>
  sidecarRequest<RollbackResponse>('app.update.rollback')

const resolveCheckStatus = (result: CheckResponse): UpdateStatus => {
  if (result.hasUpdate && result.version) {
    return { kind: 'available', version: result.version, notes: result.notes }
  }
  return { kind: 'up-to-date' }
}

const resolveDownloadStatus = (result: DownloadResponse): UpdateStatus => {
  if (result.done) return { kind: 'ready', version: result.version }
  return { kind: 'downloading', version: result.version, progress: result.progress }
}

export type AppUpdaterApi = {
  readonly status: UpdateStatus
  readonly checkForUpdates: () => Promise<void>
  readonly downloadUpdate: () => Promise<void>
  readonly installUpdate: () => Promise<void>
  readonly rollback: () => Promise<void>
}

export type AppUpdaterOptions = {
  readonly autoCheck: boolean | undefined
}

export const useAppUpdater = (options: AppUpdaterOptions | undefined): AppUpdaterApi => {
  const [status, setStatus] = useState<UpdateStatus>({ kind: 'idle' })

  const checkForUpdates = useCallback(async (): Promise<void> => {
    setStatus({ kind: 'checking' })
    try {
      const result = await requestCheck()
      if (!isCheckResponse(result)) throw new Error('invalid check response')
      setStatus(resolveCheckStatus(result))
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err) })
    }
  }, [])

  const downloadUpdate = useCallback(async (): Promise<void> => {
    try {
      const result = await requestDownload()
      if (!isDownloadResponse(result)) throw new Error('invalid download response')
      setStatus(resolveDownloadStatus(result))
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err) })
    }
  }, [])

  const installUpdate = useCallback(async (): Promise<void> => {
    try {
      const result = await requestInstall()
      if (!isInstallResponse(result)) throw new Error('invalid install response')
      setStatus({ kind: 'installed', version: result.version })
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err) })
    }
  }, [])

  const rollback = useCallback(async (): Promise<void> => {
    try {
      const result = await requestRollback()
      if (!isRollbackResponse(result)) throw new Error('invalid rollback response')
      setStatus({ kind: 'rolled-back', previousVersion: result.previousVersion })
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err) })
    }
  }, [])

  const autoCheck = options?.autoCheck ?? false
  useEffect(() => {
    if (autoCheck) {
      void checkForUpdates()
    }
  }, [autoCheck, checkForUpdates])

  return { status, checkForUpdates, downloadUpdate, installUpdate, rollback }
}
