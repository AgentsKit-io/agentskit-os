// Build a publishable PluginConfig manifest. Validates shape, adds
// signature when signer provided, returns ready-to-distribute manifest.

import {
  parsePluginConfig,
  type PluginConfig,
  type PluginSignature,
} from '@agentskit/os-core'

export type ManifestSigner = {
  /** Signs the canonical bytes of the unsigned manifest. */
  sign(canonical: string): Promise<{ algorithm: 'ed25519' | 'rsa-sha256'; publicKey: string; signature: string }>
}

export type BuildOptions = {
  readonly signer?: ManifestSigner
}

export const buildManifest = async (
  raw: unknown,
  opts: BuildOptions = {},
): Promise<PluginConfig> => {
  const unsigned = parsePluginConfig(raw)
  if (!opts.signer) return unsigned
  const canonical = JSON.stringify(unsigned)
  const sig = await opts.signer.sign(canonical)
  const signature: PluginSignature = {
    algorithm: sig.algorithm,
    publicKey: sig.publicKey,
    signature: sig.signature,
  }
  return parsePluginConfig({ ...unsigned, signature })
}

export const stripSignature = (manifest: PluginConfig): PluginConfig => {
  const { signature: _signature, ...rest } = manifest as PluginConfig & {
    signature?: PluginSignature
  }
  return parsePluginConfig(rest)
}
