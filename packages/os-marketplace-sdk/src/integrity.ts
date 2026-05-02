// Integrity hash helpers. SHA-256 + SHA-512 over canonical JSON / bytes.
// Pure crypto via Web Crypto API.

const toHex = (bytes: Uint8Array): string => {
  let out = ''
  for (let i = 0; i < bytes.length; i++) out += bytes[i]!.toString(16).padStart(2, '0')
  return out
}

const digest = async (algorithm: 'SHA-256' | 'SHA-512', data: Uint8Array): Promise<string> => {
  const ab = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
  const buf = await crypto.subtle.digest(algorithm, ab as ArrayBuffer)
  return toHex(new Uint8Array(buf))
}

export const sha256OfBytes = async (data: Uint8Array): Promise<string> => {
  const hex = await digest('SHA-256', data)
  return `sha256:${hex}`
}

export const sha512OfBytes = async (data: Uint8Array): Promise<string> => {
  const hex = await digest('SHA-512', data)
  return `sha512:${hex}`
}

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = canonicalize((value as Record<string, unknown>)[key])
    }
    return out
  }
  return value
}

export const canonicalJson = (value: unknown): string => JSON.stringify(canonicalize(value))

export const sha256OfCanonical = async (value: unknown): Promise<string> => {
  return sha256OfBytes(new TextEncoder().encode(canonicalJson(value)))
}

export const sha512OfCanonical = async (value: unknown): Promise<string> => {
  return sha512OfBytes(new TextEncoder().encode(canonicalJson(value)))
}

export const verifyIntegrity = (expected: string, actual: string): boolean => {
  // Constant-time comparison would be needed for HMAC; for content-addressed
  // hashes, naive equality is fine — both sides know expected.
  return expected === actual
}
