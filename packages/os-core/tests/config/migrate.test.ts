import { describe, expect, it } from 'vitest'
import { MigrationError, migrateConfig, type MigrationRegistry } from '../../src/config/migrate.js'

const reg: MigrationRegistry = [
  {
    from: 1,
    to: 2,
    description: 'rename foo→bar',
    migrate: (input) => {
      const { foo, ...rest } = input as { foo: unknown }
      return { ...rest, bar: foo }
    },
  },
  {
    from: 2,
    to: 3,
    description: 'wrap bar in object',
    migrate: (input) => ({ ...input, bar: { value: (input as any).bar } }),
  },
]

describe('migrateConfig', () => {
  it('returns input unchanged when versions match', () => {
    const r = migrateConfig({ schemaVersion: 3, bar: { value: 42 } }, reg, 3)
    expect(r.steps).toEqual([])
    expect(r.fromVersion).toBe(3)
    expect(r.toVersion).toBe(3)
  })

  it('chains migrations in order', () => {
    const r = migrateConfig({ schemaVersion: 1, foo: 42 }, reg, 3)
    expect(r.fromVersion).toBe(1)
    expect(r.toVersion).toBe(3)
    expect(r.steps.map((s) => s.description)).toEqual(['rename foo→bar', 'wrap bar in object'])
    expect(r.output).toEqual({ schemaVersion: 3, bar: { value: 42 } })
  })

  it('migrates partial range', () => {
    const r = migrateConfig({ schemaVersion: 2, bar: 7 }, reg, 3)
    expect(r.steps).toHaveLength(1)
    expect((r.output as any).bar).toEqual({ value: 7 })
  })

  it('throws MigrationError on missing schemaVersion', () => {
    expect(() => migrateConfig({}, reg, 3)).toThrow(MigrationError)
  })

  it('throws on input newer than target', () => {
    try {
      migrateConfig({ schemaVersion: 5 }, reg, 3)
    } catch (e) {
      expect(e).toBeInstanceOf(MigrationError)
      expect((e as MigrationError).code).toBe('config.future_version')
      return
    }
    throw new Error('expected throw')
  })

  it('throws when migration gap', () => {
    try {
      migrateConfig({ schemaVersion: 1 }, [], 3)
    } catch (e) {
      expect((e as MigrationError).code).toBe('config.migration_gap')
      return
    }
    throw new Error('expected throw')
  })

  it('throws when registered step skips a version', () => {
    const bad: MigrationRegistry = [
      { from: 1, to: 3, description: 'jump', migrate: (x) => x },
    ]
    try {
      migrateConfig({ schemaVersion: 1 }, bad, 3)
    } catch (e) {
      expect((e as MigrationError).code).toBe('config.migration_skip')
      return
    }
    throw new Error('expected throw')
  })

  it('throws when migrator returns non-object', () => {
    const bad: MigrationRegistry = [
      { from: 1, to: 2, description: 'broken', migrate: () => null as any },
    ]
    try {
      migrateConfig({ schemaVersion: 1 }, bad, 2)
    } catch (e) {
      expect((e as MigrationError).code).toBe('config.migration_invalid_output')
      return
    }
    throw new Error('expected throw')
  })

  it('throws on non-object input', () => {
    expect(() => migrateConfig(null, reg, 3)).toThrow(MigrationError)
  })
})
