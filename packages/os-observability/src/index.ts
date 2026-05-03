export {
  createLogSink,
  defaultClassify,
  defaultFormat,
  defaultExtract,
} from './log-sink.js'
export type {
  LogLevel,
  LogLine,
  LogWriter,
  LogSinkOptions,
} from './log-sink.js'

export { consoleLogWriter } from './console-writer.js'
export type { ConsoleLogWriterOptions } from './console-writer.js'

export { replayEvents } from './replay.js'

export const PACKAGE_NAME = '@agentskit/os-observability' as const
export const PACKAGE_VERSION = '0.0.0' as const
