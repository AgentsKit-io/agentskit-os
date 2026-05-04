import { Box, Text, renderToString } from 'ink'

export type TemplateListRow = {
  readonly id: string
  readonly category: string
  readonly difficulty: string
  readonly name: string
}

const TemplateList = ({ rows }: { readonly rows: readonly TemplateListRow[] }) => (
  <Box flexDirection="column">
    <Box flexDirection="column" marginBottom={1}>
      <Text bold>Built-in flow templates</Text>
    </Box>
    {rows.map((r) => (
      <Box key={r.id} flexDirection="row" columnGap={2}>
        <Text wrap="truncate">{r.id.padEnd(28)}</Text>
        <Text wrap="truncate">{r.category.padEnd(12)}</Text>
        <Text wrap="truncate">{r.difficulty.padEnd(12)}</Text>
        <Text>{r.name}</Text>
      </Box>
    ))}
  </Box>
)

/** Renders the template table with Ink (static string; no TTY / stdin required). */
export const templateListToInkString = (rows: readonly TemplateListRow[]): string =>
  `${renderToString(<TemplateList rows={rows} />, { columns: 100 })}\n`
