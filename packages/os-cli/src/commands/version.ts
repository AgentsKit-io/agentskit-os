import { PACKAGE_NAME, PACKAGE_VERSION } from '@agentskit/os-core'
import type { CliCommand, CliExit } from '../types.js'

export const CLI_VERSION = '0.0.0' as const

export const version: CliCommand = {
  name: 'version',
  summary: 'Print CLI version + linked os-core version',
  run: async (): Promise<CliExit> => ({
    code: 0,
    stdout: `agentskit-os ${CLI_VERSION}\n${PACKAGE_NAME} ${PACKAGE_VERSION}\n`,
    stderr: '',
  }),
}
