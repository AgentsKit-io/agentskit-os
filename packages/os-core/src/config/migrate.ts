// Versioned config migrations. Pure functions: (input, fromVersion) → output.
// Each migration bumps schemaVersion by 1. Engine chains them.

export type MigrationStep = {
  readonly from: number
  readonly to: number
  readonly description: string
  readonly migrate: (input: Record<string, unknown>) => Record<string, unknown>
}

export type MigrationRegistry = ReadonlyArray<MigrationStep>

export type MigrationResult<T = Record<string, unknown>> = {
  readonly output: T
  readonly fromVersion: number
  readonly toVersion: number
  readonly steps: readonly { from: number; to: number; description: string }[]
}

export class MigrationError extends Error {
  readonly code: string
  readonly fromVersion: number | undefined
  readonly toVersion: number
  constructor(opts: { code: string; message: string; fromVersion?: number; toVersion: number }) {
    super(opts.message)
    this.name = 'MigrationError'
    this.code = opts.code
    this.fromVersion = opts.fromVersion
    this.toVersion = opts.toVersion
  }
}

const readSchemaVersion = (input: unknown): number => {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new MigrationError({
      code: 'config.not_object',
      message: 'config input must be a plain object',
      toVersion: 0,
    })
  }
  const v = (input as Record<string, unknown>).schemaVersion
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) {
    throw new MigrationError({
      code: 'config.missing_schema_version',
      message: 'config input is missing a positive integer `schemaVersion`',
      toVersion: 0,
    })
  }
  return v
}

export const migrateConfig = (
  input: unknown,
  registry: MigrationRegistry,
  targetVersion: number,
): MigrationResult => {
  const fromVersion = readSchemaVersion(input)
  if (fromVersion === targetVersion) {
    return {
      output: input as Record<string, unknown>,
      fromVersion,
      toVersion: targetVersion,
      steps: [],
    }
  }
  if (fromVersion > targetVersion) {
    throw new MigrationError({
      code: 'config.future_version',
      message: `config schemaVersion ${fromVersion} is newer than supported ${targetVersion}`,
      fromVersion,
      toVersion: targetVersion,
    })
  }

  let current = input as Record<string, unknown>
  let cursor = fromVersion
  const steps: { from: number; to: number; description: string }[] = []

  while (cursor < targetVersion) {
    const step = registry.find((s) => s.from === cursor)
    if (!step) {
      throw new MigrationError({
        code: 'config.migration_gap',
        message: `no migration registered from version ${cursor}`,
        fromVersion: cursor,
        toVersion: targetVersion,
      })
    }
    if (step.to !== cursor + 1) {
      throw new MigrationError({
        code: 'config.migration_skip',
        message: `migration from ${step.from} must increment by 1; got ${step.to}`,
        fromVersion: step.from,
        toVersion: step.to,
      })
    }
    const next = step.migrate(current)
    if (typeof next !== 'object' || next === null || Array.isArray(next)) {
      throw new MigrationError({
        code: 'config.migration_invalid_output',
        message: `migration ${step.from}→${step.to} returned non-object`,
        fromVersion: step.from,
        toVersion: step.to,
      })
    }
    current = { ...next, schemaVersion: step.to }
    steps.push({ from: step.from, to: step.to, description: step.description })
    cursor = step.to
  }

  return { output: current, fromVersion, toVersion: targetVersion, steps }
}
