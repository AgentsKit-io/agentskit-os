import type { ArtifactKind } from './artifact-types'

export const ARTIFACT_KIND_LABELS: Record<ArtifactKind, string> = {
  code: 'Code',
  json: 'JSON',
  yaml: 'YAML',
  csv: 'CSV',
  svg: 'SVG',
  mermaid: 'Mermaid',
  html: 'HTML',
  markdown: 'Markdown',
  image: 'Image',
  unknown: 'Unknown',
}

