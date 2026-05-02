// Plugin bundle metadata. Computes per-asset integrity + bundle-level
// sha512 over manifest + assets list. Pure compute; caller writes tarball.

import type { PluginConfig } from '@agentskit/os-core'
import { sha256OfBytes, sha512OfCanonical, sha512OfBytes } from './integrity.js'

export type AssetEntry = {
  readonly path: string
  readonly bytes: Uint8Array
}

export type AssetRecord = {
  readonly path: string
  readonly integrity: string
  readonly size: number
}

export type Bundle = {
  readonly manifest: PluginConfig
  readonly assets: readonly AssetRecord[]
  readonly bundleIntegrity: string
}

const sortByPath = (a: AssetRecord, b: AssetRecord): number =>
  a.path < b.path ? -1 : a.path > b.path ? 1 : 0

export const buildBundle = async (
  manifest: PluginConfig,
  assets: readonly AssetEntry[],
): Promise<Bundle> => {
  const records: AssetRecord[] = []
  for (const a of assets) {
    const integrity = await sha256OfBytes(a.bytes)
    records.push({ path: a.path, integrity, size: a.bytes.byteLength })
  }
  records.sort(sortByPath)
  const bundleIntegrity = await sha512OfCanonical({
    manifest,
    assets: records,
  })
  return { manifest, assets: records, bundleIntegrity }
}

export const verifyAsset = async (
  expected: string,
  bytes: Uint8Array,
): Promise<boolean> => {
  const actual = await sha256OfBytes(bytes)
  return expected === actual
}

export const verifyBundleArchive = async (
  bundle: Bundle,
  archiveBytes: Uint8Array,
): Promise<{ ok: boolean; archiveHash: string }> => {
  const archiveHash = await sha512OfBytes(archiveBytes)
  return {
    ok: archiveHash === bundle.bundleIntegrity,
    archiveHash,
  }
}
