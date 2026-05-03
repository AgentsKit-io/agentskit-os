#!/usr/bin/env node
/**
 * gen-manpages.mjs
 *
 * Walks the COMMANDS list exported from the compiled router and emits one
 * groff man(1) page per verb to packages/os-cli/man/.
 *
 * Usage:
 *   pnpm --filter @agentskit/os-cli manpages
 *
 * The script MUST be run after `pnpm build` so that dist/index.js exists.
 * Output files: man/agentskit-os-<verb>.1  (spaces in verb become dashes)
 */

import { readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgRoot = resolve(__dirname, '..')
const manDir = resolve(pkgRoot, 'man')

/** Read the package version from package.json (no import assertions needed). */
const pkg = JSON.parse(readFileSync(resolve(pkgRoot, 'package.json'), 'utf8'))
const CLI_VERSION = /** @type {string} */ (pkg.version)

/** @type {Date} */
const TODAY = new Date()
const DATE_STR = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}-${String(TODAY.getDate()).padStart(2, '0')}`

/**
 * Convert a CLI verb name to the man-page filename stem.
 * "config validate" → "config-validate"
 *
 * @param {string} name
 * @returns {string}
 */
const verbToFilename = (name) => name.replace(/\s+/g, '-')

/**
 * Escape groff special characters in plain text.
 *
 * @param {string} text
 * @returns {string}
 */
const groffEscape = (text) =>
  text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\(aq")
    .replace(/`/g, '\\(ga')
    .replace(/\./g, '\\&.')

/**
 * Build a groff man(1) page for a single command.
 *
 * @param {{ name: string; summary: string; description?: string }} cmd
 * @returns {string}
 */
export const buildManPage = (cmd) => {
  const safeName = verbToFilename(cmd.name)
  const safeNameUpper = safeName.toUpperCase()
  const summary = groffEscape(cmd.summary)
  const description = groffEscape(cmd.description ?? cmd.summary)

  return [
    `.TH "AGENTSKIT-OS-${safeNameUpper}" "1" "${DATE_STR}" "agentskit-os ${CLI_VERSION}" "AgentsKitOS CLI Manual"`,
    `.SH NAME`,
    `agentskit-os-${safeName} \\- ${summary}`,
    `.SH SYNOPSIS`,
    `.B agentskit-os`,
    `.RI ${cmd.name} " [options]"`,
    `.SH DESCRIPTION`,
    description,
    `.SH SEE ALSO`,
    `.BR agentskit-os (1)`,
    `.SH AUTHORS`,
    `AgentsKit Contributors. See \\fIhttps://github.com/AgentsKit-io/agentskit-os\\fR for details.`,
  ].join('\n') + '\n'
}

/**
 * Main entry-point. Dynamically imports the compiled CLI index to get
 * the live COMMANDS array, then writes one man-page per verb.
 */
const main = async () => {
  // Import the compiled router — run `pnpm build` first.
  const { COMMANDS } = await import('../dist/index.js')

  await mkdir(manDir, { recursive: true })

  const results = []

  for (const cmd of COMMANDS) {
    const filename = `agentskit-os-${verbToFilename(cmd.name)}.1`
    const outPath = resolve(manDir, filename)
    const content = buildManPage(cmd)
    await writeFile(outPath, content, 'utf8')
    results.push(filename)
  }

  for (const f of results) {
    process.stdout.write(`  wrote ${f}\n`)
  }
  process.stdout.write(`Done — ${results.length} man-page(s) written to ${manDir}\n`)
}

main().catch((err) => {
  process.stderr.write(`gen-manpages: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
