// PluginLoader composes manifest fetch + signature check + permission
// evaluation + registry registration. Pure decision flow; no execution.

import {
  PluginRegistry,
  isApiCompatible,
  EXTENSION_API_VERSION,
  type PluginConfig,
  type PluginPermission,
} from '@agentskit/os-core'
import type { ManifestFetcher } from './manifest-fetcher.js'
import {
  evaluateManifestPermissions,
  type GrantPolicy,
  type ManifestEvaluation,
} from './permissions.js'

export type SignatureVerifier = (manifest: PluginConfig) => Promise<boolean> | boolean

export type LoadOptions = {
  readonly fetcher: ManifestFetcher
  readonly registry: PluginRegistry
  readonly verifySignature?: SignatureVerifier
  readonly policy?: GrantPolicy
  readonly requireSignedPlugins?: boolean
  readonly hostExtensionApi?: string
}

export type LoadResult =
  | {
      kind: 'loaded'
      manifest: PluginConfig
      evaluation: ManifestEvaluation
    }
  | { kind: 'failed'; code: LoadErrorCode; message: string }

export type LoadErrorCode =
  | 'plugin.not_found'
  | 'plugin.integrity_mismatch'
  | 'plugin.signature_required'
  | 'plugin.signature_invalid'
  | 'plugin.api_incompatible'
  | 'plugin.permission_denied'
  | 'plugin.registry_conflict'
  | 'plugin.required_permission_denied'

export const loadPlugin = async (
  source: string,
  expectedIntegrity: string | undefined,
  opts: LoadOptions,
): Promise<LoadResult> => {
  const result = await opts.fetcher.fetch(source)
  if (result.kind === 'not_found') {
    return { kind: 'failed', code: 'plugin.not_found', message: `plugin source "${source}" not found` }
  }
  if (result.kind === 'integrity_mismatch') {
    return {
      kind: 'failed',
      code: 'plugin.integrity_mismatch',
      message: `expected ${result.expected}, got ${result.actual}`,
    }
  }

  const manifest = result.manifest

  if (expectedIntegrity !== undefined && expectedIntegrity !== result.integrity) {
    return {
      kind: 'failed',
      code: 'plugin.integrity_mismatch',
      message: `expected ${expectedIntegrity}, got ${result.integrity}`,
    }
  }

  if (opts.requireSignedPlugins && !manifest.signature) {
    return {
      kind: 'failed',
      code: 'plugin.signature_required',
      message: `plugin "${manifest.id}" must be signed when requireSignedPlugins is true`,
    }
  }

  if (manifest.signature && opts.verifySignature) {
    const ok = await opts.verifySignature(manifest)
    if (!ok) {
      return {
        kind: 'failed',
        code: 'plugin.signature_invalid',
        message: `signature verification failed for plugin "${manifest.id}"`,
      }
    }
  }

  const hostApi = opts.hostExtensionApi ?? EXTENSION_API_VERSION
  if (manifest.enginesOs && !isApiCompatible(hostApi, manifest.enginesOs)) {
    return {
      kind: 'failed',
      code: 'plugin.api_incompatible',
      message: `plugin "${manifest.id}" requires extensionApi ${manifest.enginesOs}, host runs ${hostApi}`,
    }
  }

  const evaluation = evaluateManifestPermissions(manifest, opts.policy)
  const deniedRequired = evaluation.denied.filter(
    (d) => d.permission.required !== false,
  )
  if (deniedRequired.length > 0) {
    return {
      kind: 'failed',
      code: 'plugin.required_permission_denied',
      message: `required permission(s) denied: ${deniedRequired.map((d) => d.permission.resource).join(', ')}`,
    }
  }

  // Register the plugin's contributions on the registry. For each
  // contribution kind the plugin declares, we register a placeholder entry
  // so the host can detect collisions. Real impls supplied at runtime.
  for (const contrib of manifest.contributes) {
    const reg = opts.registry.register({
      point: contrib as never,
      id: manifest.id,
      pluginId: manifest.id,
      version: manifest.version,
    })
    if (reg.kind === 'conflict') {
      return {
        kind: 'failed',
        code: 'plugin.registry_conflict',
        message: `plugin "${manifest.id}" conflicts with existing "${reg.conflict.existingPluginId}" on ${contrib}:${manifest.id}`,
      }
    }
  }

  return { kind: 'loaded', manifest, evaluation }
}

export const filterDangerousPermissions = (
  permissions: readonly PluginPermission[],
): readonly PluginPermission[] =>
  permissions.filter(
    (p) => p.resource.startsWith('vault:') || p.resource === 'net:fetch:any',
  )
