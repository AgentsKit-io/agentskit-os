import type { Artifact } from './artifact-types'
import { CodeRenderer } from './renderers/code-renderer'
import { JsonRenderer } from './renderers/json-renderer'
import { CsvRenderer } from './renderers/csv-renderer'
import { SvgRenderer } from './renderers/svg-renderer'
import { MermaidRenderer } from './renderers/mermaid-renderer'
import { HtmlRenderer } from './renderers/html-renderer'
import { MarkdownRenderer } from './renderers/markdown-renderer'
import { ImageRenderer } from './renderers/image-renderer'

export type ArtifactContentProps = {
  readonly artifact: Artifact
  readonly wordWrap?: boolean
}

export function ArtifactContent({ artifact, wordWrap }: ArtifactContentProps): React.JSX.Element {
  switch (artifact.kind) {
    case 'code':
    case 'yaml':
    case 'unknown': {
      const className = wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'
      return (
        <div className={className}>
          <CodeRenderer content={artifact.content} />
        </div>
      )
    }
    case 'json':
      return <JsonRenderer content={artifact.content} />
    case 'csv':
      return <CsvRenderer content={artifact.content} />
    case 'svg':
      return <SvgRenderer content={artifact.content} />
    case 'mermaid':
      return <MermaidRenderer content={artifact.content} />
    case 'html':
      return <HtmlRenderer content={artifact.content} />
    case 'markdown':
      return <MarkdownRenderer content={artifact.content} />
    case 'image':
      return <ImageRenderer content={artifact.content} name={artifact.name} />
    default:
      return <CodeRenderer content={artifact.content} />
  }
}

