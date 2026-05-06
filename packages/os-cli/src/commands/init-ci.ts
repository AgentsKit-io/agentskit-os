import { join, resolve } from 'node:path'
import { Command } from 'commander'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'

type CiTemplate = {
  readonly id: string
  readonly file: string
  readonly description: string
  readonly content: string
}

const CI_WORKFLOW = `name: agentskit-ci

on:
  pull_request:
  push:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install AgentsKit CLI
        run: npm i -g @agentskit/os-cli
      - name: Validate workspace config
        run: agentskit-os config validate agentskit-os.config.yaml
      - name: Doctor
        run: agentskit-os doctor --json
      - name: Conformance (opt-in coding agents)
        env:
          CODING_AGENT_CONFORMANCE_PROVIDERS: \${{ vars.CODING_AGENT_CONFORMANCE_PROVIDERS }}
          CODING_AGENT_CONFORMANCE_SECRETS_FILE: \${{ vars.CODING_AGENT_CONFORMANCE_SECRETS_FILE }}
        run: |
          set -euo pipefail
          if [ -z "${'${'}CODING_AGENT_CONFORMANCE_PROVIDERS:-}" ]; then
            echo "Conformance: skip (set repo variable CODING_AGENT_CONFORMANCE_PROVIDERS)."
            exit 0
          fi
          echo "$CODING_AGENT_CONFORMANCE_PROVIDERS" | tr ',' '\\n' | while IFS= read -r raw; do
            id_trim=$(echo "$raw" | tr -d '[:space:]')
            [ -z "$id_trim" ] && continue
            if [ -n "${'${'}CODING_AGENT_CONFORMANCE_SECRETS_FILE:-}" ]; then
              agentskit-os coding-agent conformance --provider "$id_trim" --skip-if-unavailable --secrets-file "$CODING_AGENT_CONFORMANCE_SECRETS_FILE" --json || exit 1
            else
              agentskit-os coding-agent conformance --provider "$id_trim" --skip-if-unavailable --json || exit 1
            fi
          done
`

const EVALS_WORKFLOW = `name: agentskit-evals

on:
  pull_request:

jobs:
  evals:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install AgentsKit CLI
        run: npm i -g @agentskit/os-cli
      - name: Run agent benchmark suite
        env:
          AGENTSKIT_RUN_MODE: dry_run
        run: agentskit-os coding-agent benchmark --timeout-ms 60000
`

const DEPLOY_WORKFLOW = `name: agentskit-deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install AgentsKit CLI
        run: npm i -g @agentskit/os-cli
      - name: Deploy flows
        env:
          AGENTSKIT_TOKEN: \${{ secrets.AGENTSKIT_TOKEN }}
        run: agentskit-os deploy --target cloud
`

export const CI_TEMPLATES: readonly CiTemplate[] = [
  {
    id: 'ci',
    file: 'agentskit-ci.yml',
    description: 'Validate config + run doctor/conformance on every PR and push to main.',
    content: CI_WORKFLOW,
  },
  {
    id: 'evals',
    file: 'agentskit-evals.yml',
    description: 'Run the agent benchmark suite in dry-run mode on every PR.',
    content: EVALS_WORKFLOW,
  },
  {
    id: 'deploy',
    file: 'agentskit-deploy.yml',
    description: 'Deploy flows to AgentsKit Cloud on push to main (requires AGENTSKIT_TOKEN).',
    content: DEPLOY_WORKFLOW,
  },
]

const findTemplate = (id: string): CiTemplate | undefined =>
  CI_TEMPLATES.find((t) => t.id === id)

const isOverwriteBlocked = async (
  io: CliIo,
  path: string,
  force: boolean,
): Promise<boolean> => !force && (await io.exists(path))

const buildProgram = (io: CliIo): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('init-ci')
    .description(
      'agentskit-os init-ci — Scaffold GitHub Actions templates (.github/workflows/) for AgentsKit projects.',
    )
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .option('--dir <dir>', 'target directory (default: current directory)', '.')
    .option('--ci', 'install the validate/doctor workflow')
    .option('--evals', 'install the evals workflow')
    .option('--deploy', 'install the deploy workflow')
    .option('--all', 'install every template (default if no flag is given)')
    .option('--list', 'list available templates and exit')
    .option('--force', 'overwrite existing workflow files', false)
    .action(
      async (opts: {
        dir: string
        ci?: boolean
        evals?: boolean
        deploy?: boolean
        all?: boolean
        list?: boolean
        force?: boolean
      }) => {
        if (opts.list) {
          const lines = CI_TEMPLATES.map((t) => `${t.id.padEnd(8)} ${t.file.padEnd(28)} ${t.description}`)
          result.current = { code: 0, stdout: `${lines.join('\n')}\n`, stderr: '' }
          return
        }

        const explicit: string[] = []
        if (opts.ci) explicit.push('ci')
        if (opts.evals) explicit.push('evals')
        if (opts.deploy) explicit.push('deploy')
        const wantsAll = opts.all || explicit.length === 0
        const ids = wantsAll ? CI_TEMPLATES.map((t) => t.id) : explicit

        const baseDir = resolve(io.cwd(), opts.dir || '.')
        const workflowsDir = join(baseDir, '.github', 'workflows')

        const skipped: string[] = []
        const written: string[] = []

        for (const id of ids) {
          const tpl = findTemplate(id)
          if (!tpl) continue
          const path = join(workflowsDir, tpl.file)
          if (await isOverwriteBlocked(io, path, opts.force ?? false)) {
            skipped.push(path)
            continue
          }
          await io.mkdir(workflowsDir)
          await io.writeFile(path, tpl.content)
          written.push(path)
        }

        if (written.length === 0 && skipped.length > 0) {
          result.current = {
            code: 4,
            stdout: '',
            stderr: `error: refusing to overwrite existing workflow file(s):\n${skipped.map((p) => `  ${p}`).join('\n')}\nUse --force to overwrite.\n`,
          }
          return
        }

        const lines = [
          ...written.map((p) => `created ${p}`),
          ...skipped.map((p) => `skipped ${p} (already exists; use --force to overwrite)`),
          ``,
          `Installed ${written.length} workflow template(s).`,
          `Next:  commit the new files in .github/workflows/ and push to enable CI.`,
        ]
        result.current = { code: 0, stdout: `${lines.join('\n')}\n`, stderr: '' }
      },
    )
  return { program, result }
}

export const initCi: CliCommand = {
  name: 'init-ci',
  summary: 'Scaffold GitHub Actions templates for an AgentsKit project',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const { program, result } = buildProgram(io)
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) return parsed
    if (result.current) return result.current
    return { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
