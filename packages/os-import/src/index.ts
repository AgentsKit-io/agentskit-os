import type { Importer, ImporterRegistry, ImportResult } from './types.js'
import { n8nImporter } from './importers/n8n.js'
import { langflowImporter } from './importers/langflow.js'
import { difyImporter } from './importers/dify.js'
import { langgraphImporter } from './importers/langgraph.js'

export type { Importer, ImporterRegistry, ImportResult, ImportWarning } from './types.js'
export { n8nImporter } from './importers/n8n.js'
export { langflowImporter } from './importers/langflow.js'
export { difyImporter } from './importers/dify.js'
export { langgraphImporter } from './importers/langgraph.js'

export const builtInImporters: ImporterRegistry = [
  n8nImporter,
  langflowImporter,
  difyImporter,
  langgraphImporter,
]

export const detectImporter = (
  input: unknown,
  registry: ImporterRegistry = builtInImporters,
): Importer | undefined => registry.find((i) => i.detect(input))

export const importWorkflow = (
  input: unknown,
  registry: ImporterRegistry = builtInImporters,
): ImportResult => {
  const importer = detectImporter(input, registry)
  if (!importer) {
    throw new Error(
      `no importer matched input shape (tried: ${registry.map((i) => i.source).join(', ')})`,
    )
  }
  return importer.parse(input)
}

export const PACKAGE_NAME = '@agentskit/os-import' as const
export const PACKAGE_VERSION = '0.0.0' as const
