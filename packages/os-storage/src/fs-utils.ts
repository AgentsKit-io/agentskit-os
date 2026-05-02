// Pluggable FS adapter — defaults to node:fs/promises but accepts in-memory
// fakes so tests stay hermetic.

export interface FileSystem {
  mkdir(path: string, options: { recursive: true }): Promise<void>
  appendFile(path: string, data: string, encoding: 'utf8'): Promise<void>
  readFile(path: string, encoding: 'utf8'): Promise<string>
  writeFile(path: string, data: string, encoding: 'utf8'): Promise<void>
  unlink(path: string): Promise<void>
  exists(path: string): Promise<boolean>
  readdir(path: string): Promise<readonly string[]>
}

export const nodeFs = async (): Promise<FileSystem> => {
  const { mkdir, appendFile, readFile, writeFile, unlink, access, readdir } = await import(
    'node:fs/promises'
  )
  return {
    mkdir: async (p, opts) => {
      await mkdir(p, opts)
    },
    appendFile: async (p, data, enc) => {
      await appendFile(p, data, enc)
    },
    readFile: (p, enc) => readFile(p, enc),
    writeFile: async (p, data, enc) => {
      await writeFile(p, data, enc)
    },
    unlink: async (p) => {
      await unlink(p)
    },
    exists: async (p) => {
      try {
        await access(p)
        return true
      } catch {
        return false
      }
    },
    readdir: async (p) => readdir(p),
  }
}

// Slug-safe id segment for path components.
export const safeRunId = (id: string): string => id.replace(/[^A-Za-z0-9._-]/g, '_')
