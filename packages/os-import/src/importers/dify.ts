// Dify importer placeholder. Detect-only for now; parse stub raises.

import type { Importer } from '../types.js'

export const difyImporter: Importer = {
  source: 'dify',
  displayName: 'Dify',
  detect: (input) => {
    if (typeof input !== 'object' || input === null) return false
    const obj = input as Record<string, unknown>
    return obj['app'] !== undefined && obj['workflow'] !== undefined
  },
  parse: () => {
    throw new Error('dify importer: not yet implemented (M2)')
  },
}
