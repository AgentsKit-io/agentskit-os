// Default LogWriter — emits one JSON line per LogLine to console.
// Picks the matching console method per level so terminals colorize.

import type { LogLine, LogWriter } from './log-sink.js'

export type ConsoleLogWriterOptions = {
  readonly console?: Pick<Console, 'debug' | 'info' | 'warn' | 'error'>
  readonly stringify?: (line: LogLine) => string
}

const defaultStringify = (line: LogLine): string => JSON.stringify(line)

export const consoleLogWriter = (opts: ConsoleLogWriterOptions = {}): LogWriter => {
  const c = opts.console ?? console
  const stringify = opts.stringify ?? defaultStringify
  return {
    write: (line) => {
      const out = stringify(line)
      switch (line.level) {
        case 'debug':
          c.debug(out)
          break
        case 'info':
          c.info(out)
          break
        case 'warn':
          c.warn(out)
          break
        case 'error':
          c.error(out)
          break
      }
    },
  }
}
