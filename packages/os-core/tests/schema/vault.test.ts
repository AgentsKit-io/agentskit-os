import { describe, expect, it } from 'vitest'
import { parseVaultConfig, safeParseVaultConfig } from '../../src/schema/vault.js'

describe('VaultConfig', () => {
  describe('file backend', () => {
    it('parses defaults', () => {
      const v = parseVaultConfig({ backend: 'file', path: '/var/agentskitos/vault' })
      expect(v.backend === 'file' && v.encryption).toBe('aes-256-gcm')
      expect(v.autoLockSeconds).toBe(900)
    })
    it('rejects empty path', () => {
      expect(safeParseVaultConfig({ backend: 'file', path: '' }).success).toBe(false)
    })
  })

  describe('os-keychain backend', () => {
    it('parses with default service', () => {
      const v = parseVaultConfig({ backend: 'os-keychain' })
      expect(v.backend === 'os-keychain' && v.service).toBe('agentskit-os')
    })
  })

  describe('env backend', () => {
    it('accepts default prefix', () => {
      const v = parseVaultConfig({ backend: 'env' })
      expect(v.backend === 'env' && v.prefix).toBe('AGENTSKITOS_')
    })
    it('rejects lowercase prefix', () => {
      expect(safeParseVaultConfig({ backend: 'env', prefix: 'lower_' }).success).toBe(false)
    })
  })

  describe('external backend', () => {
    it('accepts known providers', () => {
      const v = parseVaultConfig({ backend: 'external', provider: '1password' })
      expect(v.backend === 'external' && v.provider).toBe('1password')
    })
    it('rejects unknown provider', () => {
      expect(
        safeParseVaultConfig({ backend: 'external', provider: 'random-vault' }).success,
      ).toBe(false)
    })
  })

  describe('discriminator', () => {
    it('rejects unknown backend', () => {
      expect(safeParseVaultConfig({ backend: 'memory' }).success).toBe(false)
    })
    it('rejects autoLockSeconds out of range', () => {
      expect(
        safeParseVaultConfig({ backend: 'os-keychain', autoLockSeconds: -1 }).success,
      ).toBe(false)
    })
    it('throws on parseVaultConfig with invalid input', () => {
      expect(() => parseVaultConfig({})).toThrow()
    })
  })
})
