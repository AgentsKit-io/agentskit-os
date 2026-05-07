// Shared SHA-256 helper used by the audit chain (#106), integrity verifier
// (#241), and workspace migration bundle (#236). Pure: WebCrypto under the
// hood; returns lowercase hex.

export const sha256Hex = async (s: string): Promise<string> => {
  const data = new TextEncoder().encode(s)
  const ab = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
  const buf = await crypto.subtle.digest('SHA-256', ab as ArrayBuffer)
  const bytes = new Uint8Array(buf)
  let hex = ''
  for (let i = 0; i < bytes.length; i += 1) hex += bytes[i]!.toString(16).padStart(2, '0')
  return hex
}
