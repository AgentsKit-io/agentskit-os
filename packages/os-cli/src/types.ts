export type CliExit = { code: number; stdout: string; stderr: string }

export type CliCommand = {
  readonly name: string
  readonly summary: string
  readonly run: (argv: readonly string[], io?: CliIo) => Promise<CliExit>
}

export type CliIo = {
  readonly readFile: (path: string) => Promise<string>
  readonly readBinary?: (path: string) => Promise<Uint8Array>
  readonly writeFile: (path: string, contents: string) => Promise<void>
  readonly mkdir: (path: string) => Promise<void>
  readonly exists: (path: string) => Promise<boolean>
  readonly readdir?: (path: string) => Promise<readonly string[]>
  readonly cwd: () => string
}
