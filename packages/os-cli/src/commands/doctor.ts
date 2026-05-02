import { PACKAGE_VERSION as OS_CORE_VERSION } from '@agentskit/os-core'
import type { CliCommand, CliExit } from '../types.js'
import { CLI_VERSION } from './version.js'

type Check = { name: string; ok: boolean; detail: string }

const MIN_NODE_MAJOR = 22

const checkNodeVersion = (): Check => {
  const v = process.versions.node
  const major = Number.parseInt(v.split('.')[0] ?? '0', 10)
  return {
    name: 'node',
    ok: major >= MIN_NODE_MAJOR,
    detail: `node ${v} (require >=${MIN_NODE_MAJOR})`,
  }
}

const checkOsCore = (): Check => ({
  name: 'os-core',
  ok: typeof OS_CORE_VERSION === 'string' && OS_CORE_VERSION.length > 0,
  detail: `@agentskit/os-core ${OS_CORE_VERSION}`,
})

const checkPlatform = (): Check => {
  const supported = ['darwin', 'linux', 'win32']
  const ok = supported.includes(process.platform)
  return {
    name: 'platform',
    ok,
    detail: `${process.platform} ${process.arch} (supported: ${supported.join(', ')})`,
  }
}

const checkAgentskitOsHome = (): Check => {
  const home = process.env.AGENTSKITOS_HOME
  return home
    ? { name: 'AGENTSKITOS_HOME', ok: true, detail: home }
    : { name: 'AGENTSKITOS_HOME', ok: true, detail: '(unset, will default to ~/.agentskitos)' }
}

const help = `agentskit-os doctor

Diagnoses CLI environment: node version, platform, linked os-core,
AGENTSKITOS_HOME. Exits 0 when all critical checks pass, 1 otherwise.
`

export const doctor: CliCommand = {
  name: 'doctor',
  summary: 'Diagnose CLI environment + linked package versions',
  run: async (argv): Promise<CliExit> => {
    if (argv[0] === '--help' || argv[0] === '-h') {
      return { code: 2, stdout: '', stderr: help }
    }

    const checks: Check[] = [
      checkNodeVersion(),
      checkPlatform(),
      checkOsCore(),
      checkAgentskitOsHome(),
    ]

    const lines = checks.map((c) => `${c.ok ? '[ok]' : '[FAIL]'} ${c.name.padEnd(20)} ${c.detail}`)
    const failed = checks.filter((c) => !c.ok).length
    const summary = failed === 0 ? `\nall checks passed (cli ${CLI_VERSION})` : `\n${failed} check(s) failed`

    return {
      code: failed === 0 ? 0 : 1,
      stdout: failed === 0 ? `${lines.join('\n')}${summary}\n` : '',
      stderr: failed === 0 ? '' : `${lines.join('\n')}${summary}\n`,
    }
  },
}
