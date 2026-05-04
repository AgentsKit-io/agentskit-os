import { spawn } from 'node:child_process'

export type ExecResult = {
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
}

export type WhichFn = (command: string) => Promise<string | null>

export type RunFn = (opts: {
  readonly command: string
  readonly args: readonly string[]
  readonly cwd: string
  readonly timeoutMs: number
  readonly stdin?: string
}) => Promise<ExecResult>

export type SubprocessRunner = {
  readonly which: WhichFn
  readonly run: RunFn
}

export const defaultRun: RunFn = async ({ command, args, cwd, timeoutMs, stdin }) =>
  new Promise((resolve) => {
    const child = spawn(command, [...args], {
      cwd,
      windowsHide: true,
      stdio: stdin === undefined ? ['ignore', 'pipe', 'pipe'] : ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    const timer = setTimeout(() => {
      child.kill('SIGKILL')
    }, timeoutMs)

    if (stdin !== undefined) {
      child.stdin?.end(stdin)
    }

    child.stdout?.on('data', (d) => { stdout += String(d) })
    child.stderr?.on('data', (d) => { stderr += String(d) })

    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({
        exitCode: 127,
        stdout,
        stderr: stderr || (err instanceof Error ? err.message : String(err)),
      })
    })

    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ exitCode: code ?? 1, stdout, stderr })
    })
  })

export const defaultWhich: WhichFn = async (command) => {
  const r = await defaultRun({
    command: process.platform === 'win32' ? 'where' : 'command',
    args: process.platform === 'win32' ? [command] : ['-v', command],
    cwd: process.cwd(),
    timeoutMs: 1500,
  })
  if (r.exitCode !== 0) return null
  const line = r.stdout.split(/\r?\n/).map((s) => s.trim()).find(Boolean)
  return line ?? command
}

export const createSubprocessRunner = (opts?: {
  readonly which?: WhichFn
  readonly run?: RunFn
}): SubprocessRunner => ({
  which: opts?.which ?? defaultWhich,
  run: opts?.run ?? defaultRun,
})
