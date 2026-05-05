type SecretReader = () => Promise<string>

const defaultReadSecretFromStdin: SecretReader = async () => {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const buf = Buffer.concat(chunks)
  return buf.toString('utf8').replace(/\r?\n$/, '')
}

let readSecretImpl: SecretReader = defaultReadSecretFromStdin

/** Reads one secret payload from stdin (trim trailing newline only). */
export const readSecretFromStdin = (): Promise<string> => readSecretImpl()

/** Test hook — restores default stdin reader. */
export const resetReadSecretFromStdinForTests = (): void => {
  readSecretImpl = defaultReadSecretFromStdin
}

/** Test hook — inject a fake reader (reset in afterEach). */
export const setReadSecretFromStdinForTests = (fn: SecretReader): void => {
  readSecretImpl = fn
}
