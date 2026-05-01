import { describe, expect, it } from 'vitest'
import { PACKAGE_NAME, PACKAGE_VERSION } from '../src/index.js'

describe('@agentskit/os-core smoke', () => {
  it('exports package identity', () => {
    expect(PACKAGE_NAME).toBe('@agentskit/os-core')
    expect(PACKAGE_VERSION).toBe('0.0.0')
  })
})
