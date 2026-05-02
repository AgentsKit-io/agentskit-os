// Langflow importer placeholder. Detect-only for now; parse stub raises.
// Real translation lands in M2 once a pinned Langflow JSON sample is locked in.

import type { Importer } from '../types.js'

export const langflowImporter: Importer = {
  source: 'langflow',
  displayName: 'Langflow',
  detect: (input) => {
    if (typeof input !== 'object' || input === null) return false
    const obj = input as Record<string, unknown>
    return typeof obj['data'] === 'object' && (obj['name'] !== undefined || obj['flow_name'] !== undefined)
  },
  parse: () => {
    throw new Error('langflow importer: not yet implemented (M2)')
  },
}
