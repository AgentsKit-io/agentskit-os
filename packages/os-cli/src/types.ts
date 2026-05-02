export type CliExit = { code: number; stdout: string; stderr: string }

export type CliCommand = {
  readonly name: string
  readonly summary: string
  readonly run: (argv: readonly string[], io?: CliIo) => Promise<CliExit>
}

export type CliIo = {
  readonly readFile: (path: string) => Promise<string>
  readonly cwd: () => string
}
