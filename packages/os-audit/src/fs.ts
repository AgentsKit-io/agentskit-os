// Pluggable FS adapter — mirrors os-storage/fs-utils so os-audit stays
// independent. Defaults to node:fs/promises; tests inject in-memory fakes.

export interface FileSystem {
  mkdir(path: string, options: { recursive: true }): Promise<void>
  appendFile(path: string, data: string, encoding: 'utf8'): Promise<void>
  readFile(path: string, encoding: 'utf8'): Promise<string>
  exists(path: string): Promise<boolean>
  readdir(path: string): Promise<readonly string[]>
}

export const nodeFs = async (): Promise<FileSystem> => {
  const { mkdir, appendFile, readFile, access, readdir } = await import('node:fs/promises')
  return {
    mkdir: async (p, opts) => {
      await mkdir(p, opts)
    },
    appendFile: async (p, data, enc) => {
      await appendFile(p, data, enc)
    },
    readFile: (p, enc) => readFile(p, enc),
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

export const safeWorkspaceId = (id: string): string => id.replace(/[^A-Za-z0-9._-]/g, '_')
