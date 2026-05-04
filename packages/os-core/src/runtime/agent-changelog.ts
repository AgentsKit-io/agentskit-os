// Per ROADMAP M3 (#53). Pure changelog renderer.
// Reads AgentsManifest, emits Conventional Commits style markdown
// per agent. Reuses #48 versioning + diffSnapshots.

import {
  diffSnapshots,
  suggestBump,
  type AgentVersion,
  type AgentsManifest,
  type Hasher,
} from '../schema/agent-version.js'

export type ChangelogEntry = {
  readonly semver: string
  readonly contentHash: string
  readonly at: string
  readonly bump: 'major' | 'minor' | 'patch' | 'initial'
  readonly note?: string
  readonly gitCommit?: string
  readonly summary: ChangelogSummary
}

export type ChangelogSummary = {
  readonly prompt: 'changed' | 'same' | 'initial'
  readonly model: 'changed' | 'same' | 'initial'
  readonly toolsAdded: readonly string[]
  readonly toolsRemoved: readonly string[]
  readonly capabilitiesAdded: readonly string[]
  readonly capabilitiesRemoved: readonly string[]
  readonly dependenciesAdded: readonly string[]
  readonly dependenciesRemoved: readonly string[]
  readonly lifecycleState: 'changed' | 'same' | 'initial'
  readonly riskTier: 'changed' | 'same' | 'initial'
}

const initialSummary = (): ChangelogSummary => ({
  prompt: 'initial',
  model: 'initial',
  toolsAdded: [],
  toolsRemoved: [],
  capabilitiesAdded: [],
  capabilitiesRemoved: [],
  dependenciesAdded: [],
  dependenciesRemoved: [],
  lifecycleState: 'initial',
  riskTier: 'initial',
})

export type GitCommitResolver = (contentHash: string, semver: string) => string | undefined

/**
 * Build entry list for one agent. Versions array must be in mint order
 * (oldest first). For each version we emit one entry whose summary is
 * the diff against the previous version, plus the suggested bump kind.
 */
export const buildChangelogEntries = (
  versions: readonly AgentVersion[],
  hasher: Hasher,
  options: { readonly gitResolver?: GitCommitResolver } = {},
): readonly ChangelogEntry[] => {
  const entries: ChangelogEntry[] = []
  for (let i = 0; i < versions.length; i++) {
    const v = versions[i]!
    const prev = i > 0 ? versions[i - 1] : undefined
    let bump: ChangelogEntry['bump']
    let summary: ChangelogSummary
    if (!prev) {
      bump = 'initial'
      summary = initialSummary()
    } else {
      const sb = suggestBump(prev.snapshot, v.snapshot, hasher)
      bump = sb === 'none' ? 'patch' : sb
      const d = diffSnapshots(prev.snapshot, v.snapshot)
      summary = {
        prompt: d.prompt,
        model: d.model,
        toolsAdded: d.tools.added,
        toolsRemoved: d.tools.removed,
        capabilitiesAdded: d.capabilities.added,
        capabilitiesRemoved: d.capabilities.removed,
        dependenciesAdded: d.dependencies.added,
        dependenciesRemoved: d.dependencies.removed,
        lifecycleState: d.lifecycleState,
        riskTier: d.riskTier,
      }
    }
    const gitCommit = options.gitResolver?.(v.contentHash, v.semver)
    entries.push({
      semver: v.semver,
      contentHash: v.contentHash,
      at: v.at,
      bump,
      ...(v.note ? { note: v.note } : {}),
      ...(gitCommit ? { gitCommit } : {}),
      summary,
    })
  }
  return entries
}

const conventionalKind = (bump: ChangelogEntry['bump']): string => {
  if (bump === 'major') return 'feat!'
  if (bump === 'minor') return 'feat'
  return 'fix'
}

const summaryLine = (s: ChangelogSummary): readonly string[] => {
  const lines: string[] = []
  if (s.prompt === 'changed') lines.push('  - prompt updated')
  if (s.model === 'changed') lines.push('  - model changed')
  if (s.lifecycleState === 'changed') lines.push('  - lifecycle state changed')
  if (s.riskTier === 'changed') lines.push('  - risk tier changed')
  if (s.toolsAdded.length > 0) lines.push(`  - tools added: ${s.toolsAdded.join(', ')}`)
  if (s.toolsRemoved.length > 0) lines.push(`  - tools removed: ${s.toolsRemoved.join(', ')}`)
  if (s.capabilitiesAdded.length > 0) lines.push(`  - capabilities added: ${s.capabilitiesAdded.join(', ')}`)
  if (s.capabilitiesRemoved.length > 0) lines.push(`  - capabilities removed: ${s.capabilitiesRemoved.join(', ')}`)
  if (s.dependenciesAdded.length > 0) lines.push(`  - dependencies added: ${s.dependenciesAdded.join(', ')}`)
  if (s.dependenciesRemoved.length > 0) lines.push(`  - dependencies removed: ${s.dependenciesRemoved.join(', ')}`)
  return lines
}

/**
 * Render Conventional Commits style markdown changelog for one agent.
 * Entries appear newest-first.
 */
export const renderAgentChangelog = (
  agentId: string,
  entries: readonly ChangelogEntry[],
): string => {
  const header = `# Changelog — ${agentId}\n\nThis file follows Conventional Commits + Keep-a-Changelog conventions.\nGenerated from \`agents.json\` — do not edit by hand.\n`
  const sections: string[] = []
  const reversed = [...entries].reverse()
  for (const e of reversed) {
    const kind = e.bump === 'initial' ? 'feat' : conventionalKind(e.bump)
    const date = e.at.slice(0, 10)
    const line1 = `## ${e.semver} — ${date}`
    const line2 = e.bump === 'initial' ? '_initial release_' : `${kind}: ${e.bump} bump`
    const note = e.note ? `\n${e.note}\n` : ''
    const sl = summaryLine(e.summary)
    const summaryBlock = sl.length > 0 ? `\n${sl.join('\n')}\n` : ''
    const meta = `\n_hash:_ \`${e.contentHash}\`${e.gitCommit ? `  _commit:_ \`${e.gitCommit}\`` : ''}\n`
    sections.push(`${line1}\n\n${line2}${note}${summaryBlock}${meta}`)
  }
  return `${header}\n${sections.join('\n')}`
}

/**
 * Build per-agent changelog files for an entire manifest.
 * Returns a Map of relative-path → contents.
 */
export const renderManifestChangelogs = (
  manifest: AgentsManifest,
  hasher: Hasher,
  options: { readonly gitResolver?: GitCommitResolver } = {},
): ReadonlyMap<string, string> => {
  const out = new Map<string, string>()
  for (const [agentId, versions] of Object.entries(manifest.agents)) {
    const entries = buildChangelogEntries(versions, hasher, options)
    out.set(`changelog/${agentId}.md`, renderAgentChangelog(agentId, entries))
  }
  return out
}
