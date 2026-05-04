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
  /**
   * Optional interactive prompt for commands that support a wizard UX.
   * If omitted, the command MUST provide a non-interactive fallback.
   */
  readonly prompt?: (message: string) => Promise<string>
  readonly cwd: () => string
}
