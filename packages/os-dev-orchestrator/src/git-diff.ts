import fs from 'node:fs'
import path from 'node:path'
import git from 'isomorphic-git'
import { structuredPatch } from 'diff'
import { z } from 'zod'

const assertSafeFsPath = (p: string): void => {
  if (!p || p.includes('\0')) throw new Error('invalid path')
  const norm = p.replaceAll('\\', '/')
  if (norm.split('/').some((seg) => seg === '..')) throw new Error('path must not contain \"..\" segments')
}

export type GitDiffHunk = {
  readonly header: string
  readonly lines: readonly string[]
}

export type GitDiffFile = {
  readonly path: string
  readonly hunks: readonly GitDiffHunk[]
}

export type GitDiffResult = {
  readonly repoRoot: string
  readonly from: string
  readonly to: string
  readonly files: readonly GitDiffFile[]
}

const InputZ = z.object({
  repoRoot: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  paths: z.array(z.string().min(1)).optional(),
  contextLines: z.number().int().min(0).max(20).optional(),
})

const toHeader = (h: { oldStart: number; oldLines: number; newStart: number; newLines: number }): string =>
  `@@ -${h.oldStart},${h.oldLines} +${h.newStart},${h.newLines} @@`

const ensureText = (buf: Uint8Array | string | null | undefined): string => {
  if (!buf) return ''
  if (typeof buf === 'string') return buf
  return Buffer.from(buf).toString('utf8')
}

const readBlobText = async (opts: {
  readonly dir: string
  readonly oid: string
  readonly filePath: string
}): Promise<string> => {
  const { blob } = await git.readBlob({ fs, dir: opts.dir, oid: opts.oid, filepath: opts.filePath })
  return ensureText(blob)
}

const listChangedFiles = async (opts: {
  readonly dir: string
  readonly from: string
  readonly to: string
}): Promise<readonly string[]> => {
  const files = new Set<string>()
  await git.walk({
    fs,
    dir: opts.dir,
    trees: [git.TREE({ ref: opts.from }), git.TREE({ ref: opts.to })],
    map: async (filepath, [a, b]) => {
      if (filepath === '.') return
      const aOid = await a?.oid()
      const bOid = await b?.oid()
      if (aOid !== bOid) files.add(filepath)
    },
  })
  return [...files].sort()
}

export const computeGitDiff = async (rawArgs: Record<string, unknown>): Promise<GitDiffResult> => {
  const input = InputZ.parse(rawArgs)
  assertSafeFsPath(input.repoRoot)
  for (const p of input.paths ?? []) assertSafeFsPath(p)

  const dir = path.resolve(input.repoRoot)
  const changed = await listChangedFiles({ dir, from: input.from, to: input.to })
  const scoped = input.paths && input.paths.length > 0 ? changed.filter((f) => input.paths!.some((p) => f.startsWith(p))) : changed

  const files: GitDiffFile[] = []
  for (const filePath of scoped) {
    // Best-effort: treat missing blobs as empty.
    let oldText = ''
    let newText = ''
    try {
      oldText = await readBlobText({ dir, oid: input.from, filePath })
    } catch {
      oldText = ''
    }
    try {
      newText = await readBlobText({ dir, oid: input.to, filePath })
    } catch {
      newText = ''
    }

    const patch = structuredPatch(filePath, filePath, oldText, newText, input.from, input.to, {
      context: input.contextLines ?? 3,
    })

    const hunks: GitDiffHunk[] = patch.hunks.map((h) => ({
      header: toHeader(h),
      lines: h.lines,
    }))

    // Skip empty hunks (binary or identical after text decode).
    if (hunks.length > 0) files.push({ path: filePath, hunks })
  }

  return {
    repoRoot: dir,
    from: input.from,
    to: input.to,
    files,
  }
}

/** Compact unified-diff text for run artifacts (#367); truncates to maxChars. */
export const formatUnifiedDiffPreview = (diff: GitDiffResult, maxChars: number): string => {
  const lines: string[] = []
  for (const f of diff.files) {
    lines.push(`diff --git a/${f.path} b/${f.path}`)
    for (const h of f.hunks) {
      lines.push(h.header)
      for (const ln of h.lines) lines.push(ln)
    }
  }
  const out = lines.join('\n')
  if (out.length <= maxChars) return out
  return `${out.slice(0, maxChars)}\n... [truncated ${out.length - maxChars} chars]`
}

