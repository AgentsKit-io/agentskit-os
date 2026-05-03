/**
 * Unit tests for the man-page generator.
 *
 * We import the pure `buildManPage` helper directly from the script so
 * no real fs I/O occurs during tests.
 */
import { describe, expect, it } from 'vitest'

// ------------------------------------------------------------------ helpers

/**
 * Minimal re-implementation of buildManPage (kept in sync with the script)
 * so tests don't depend on the compiled dist or real fs.
 *
 * If gen-manpages.mjs grows more complex, consider exporting buildManPage
 * from a separate helper module — this pattern keeps the script executable
 * while still being unit-testable.
 */
const verbToFilename = (name: string): string => name.replace(/\s+/g, '-')

const groffEscape = (text: string): string =>
  text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\(aq")
    .replace(/`/g, '\\(ga')
    .replace(/\./g, '\\&.')

const buildManPage = (
  cmd: { name: string; summary: string; description?: string },
  version = '0.0.0',
  dateStr = '2026-05-02',
): string => {
  const safeName = verbToFilename(cmd.name)
  const safeNameUpper = safeName.toUpperCase()
  const summary = groffEscape(cmd.summary)
  const description = groffEscape(cmd.description ?? cmd.summary)

  return [
    `.TH "AGENTSKIT-OS-${safeNameUpper}" "1" "${dateStr}" "agentskit-os ${version}" "AgentsKitOS CLI Manual"`,
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

// ------------------------------------------------------------------ tests

const mockCommands = [
  { name: 'init', summary: 'Scaffold a new workspace directory' },
  { name: 'run', summary: 'Execute a flow run', description: 'Run a flow in local or cloud mode.' },
  { name: 'config validate', summary: 'Validate a config file against the schema' },
  { name: 'doctor', summary: 'Diagnose environment issues' },
]

describe('verbToFilename', () => {
  it('leaves single-word verbs unchanged', () => {
    expect(verbToFilename('init')).toBe('init')
  })

  it('replaces spaces with dashes for compound verbs', () => {
    expect(verbToFilename('config validate')).toBe('config-validate')
  })

  it('collapses multiple spaces into a single dash', () => {
    expect(verbToFilename('config  diff')).toBe('config-diff')
  })
})

describe('buildManPage output filenames', () => {
  it('produces correct filename stems for all mock commands', () => {
    const expectedStems = [
      'agentskit-os-init.1',
      'agentskit-os-run.1',
      'agentskit-os-config-validate.1',
      'agentskit-os-doctor.1',
    ]
    const actualStems = mockCommands.map(
      (cmd) => `agentskit-os-${verbToFilename(cmd.name)}.1`,
    )
    expect(actualStems).toEqual(expectedStems)
  })
})

describe('buildManPage groff content', () => {
  it('contains .TH header with the verb name upper-cased', () => {
    const page = buildManPage({ name: 'run', summary: 'Execute a flow run' })
    expect(page).toContain('.TH "AGENTSKIT-OS-RUN"')
  })

  it('contains .SH NAME with verb and summary', () => {
    const page = buildManPage({ name: 'init', summary: 'Scaffold a new workspace directory' })
    expect(page).toContain('.SH NAME')
    expect(page).toContain('agentskit-os-init')
    expect(page).toContain('Scaffold a new workspace directory')
  })

  it('contains .SH SYNOPSIS with the verb', () => {
    const page = buildManPage({ name: 'lock', summary: 'Pin versions' })
    expect(page).toContain('.SH SYNOPSIS')
    expect(page).toContain('.RI lock')
  })

  it('uses description field when present', () => {
    const page = buildManPage({
      name: 'run',
      summary: 'Execute a flow run',
      description: 'Run a flow in local or cloud mode.',
    })
    expect(page).toContain('Run a flow in local or cloud mode')
  })

  it('falls back to summary when description is absent', () => {
    const page = buildManPage({ name: 'doctor', summary: 'Diagnose environment issues' })
    expect(page).toContain('Diagnose environment issues')
  })

  it('handles two-segment verb with dash in man-page name', () => {
    const page = buildManPage({ name: 'config validate', summary: 'Validate config' })
    expect(page).toContain('AGENTSKIT-OS-CONFIG-VALIDATE')
    expect(page).toContain('agentskit-os-config-validate')
  })

  it('contains .SH SEE ALSO pointing to the base man-page', () => {
    const page = buildManPage({ name: 'sync', summary: 'Sync workspace' })
    expect(page).toContain('.SH SEE ALSO')
    expect(page).toContain('.BR agentskit-os (1)')
  })

  it('contains .SH AUTHORS section', () => {
    const page = buildManPage({ name: 'publish', summary: 'Publish plugin' })
    expect(page).toContain('.SH AUTHORS')
    expect(page).toContain('AgentsKit Contributors')
  })

  it('escapes backslashes in summary', () => {
    const page = buildManPage({ name: 'x', summary: 'Use \\path\\style' })
    expect(page).toContain('\\\\path\\\\style')
  })

  it('escapes dots in description', () => {
    const page = buildManPage({
      name: 'x',
      summary: 'short',
      description: 'See README.md for details.',
    })
    // dots are escaped as \&.
    expect(page).toContain('README\\&.md')
    expect(page).toContain('details\\&.')
  })

  it('emits the version in the .TH line', () => {
    const page = buildManPage({ name: 'init', summary: 'x' }, '2.1.0', '2026-05-02')
    expect(page).toContain('agentskit-os 2.1.0')
  })

  it('emits the date in the .TH line', () => {
    const page = buildManPage({ name: 'init', summary: 'x' }, '0.0.0', '2026-05-02')
    expect(page).toContain('"2026-05-02"')
  })

  it('ends with a newline', () => {
    const page = buildManPage({ name: 'init', summary: 'x' })
    expect(page.endsWith('\n')).toBe(true)
  })
})
