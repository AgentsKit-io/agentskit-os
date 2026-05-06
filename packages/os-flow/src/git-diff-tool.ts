import { z } from 'zod'

export const GIT_DIFF_TOOL_NAME = 'tools.git.diff' as const

export const GitDiffToolInput = z.object({
  repo: z.string().min(1).max(2048),
  from: z.string().min(1).max(128),
  to: z.string().min(1).max(128),
  paths: z.array(z.string().min(1).max(1024)).max(256).default([]),
  contextLines: z.number().int().min(0).max(20).default(3),
})
export type GitDiffToolInput = z.infer<typeof GitDiffToolInput>

export const GitDiffLine = z.object({
  kind: z.enum(['context', 'add', 'remove']),
  text: z.string(),
})
export type GitDiffLine = z.infer<typeof GitDiffLine>

export const GitDiffHunk = z.object({
  header: z.string().min(1).max(512),
  oldStart: z.number().int().nonnegative(),
  oldLines: z.number().int().nonnegative(),
  newStart: z.number().int().nonnegative(),
  newLines: z.number().int().nonnegative(),
  lines: z.array(GitDiffLine).max(50_000),
})
export type GitDiffHunk = z.infer<typeof GitDiffHunk>

export const GitDiffFile = z.object({
  oldPath: z.string().min(1).max(2048),
  newPath: z.string().min(1).max(2048),
  status: z.enum(['added', 'deleted', 'modified', 'renamed']),
  hunks: z.array(GitDiffHunk).max(10_000),
})
export type GitDiffFile = z.infer<typeof GitDiffFile>

export const GitDiffResult = z.object({
  tool: z.literal(GIT_DIFF_TOOL_NAME),
  repo: z.string().min(1).max(2048),
  from: z.string().min(1).max(128),
  to: z.string().min(1).max(128),
  files: z.array(GitDiffFile).max(10_000),
})
export type GitDiffResult = z.infer<typeof GitDiffResult>

export type GitDiffToolCall = {
  readonly tool: typeof GIT_DIFF_TOOL_NAME
  readonly input: GitDiffToolInput
}

const HUNK_RE = /^@@ -(\d+)(,\d+|) \+(\d+)(,\d+|) @@/

const stripGitPrefix = (path: string): string => {
  if (path === '/dev/null') return path
  if (path.startsWith('a/') || path.startsWith('b/')) return path.slice(2)
  return path
}

const parseDiffHeader = (line: string): { oldPath: string; newPath: string } | null => {
  const match = /^diff --git a\/(.+) b\/(.+)$/.exec(line)
  if (!match) return null
  return { oldPath: match[1]!, newPath: match[2]! }
}

const statusFor = (oldPath: string, newPath: string): GitDiffFile['status'] => {
  if (oldPath === '/dev/null') return 'added'
  if (newPath === '/dev/null') return 'deleted'
  if (oldPath !== newPath) return 'renamed'
  return 'modified'
}

const defaultLineCount = (value: string | undefined): number => {
  if (!value) return 1
  return Number(value.replace(',', ''))
}

const pushCurrentHunk = (file: GitDiffFile | undefined, hunk: GitDiffHunk | undefined): GitDiffHunk | undefined => {
  if (file && hunk) {
    ;(file.hunks as GitDiffHunk[]).push(hunk)
  }
  return undefined
}

const pushCurrentFile = (files: GitDiffFile[], file: GitDiffFile | undefined, hunk: GitDiffHunk | undefined): undefined => {
  pushCurrentHunk(file, hunk)
  if (file) files.push(file)
  return undefined
}

export const createGitDiffToolCall = (input: GitDiffToolInput): GitDiffToolCall => ({
  tool: GIT_DIFF_TOOL_NAME,
  input: GitDiffToolInput.parse(input),
})

export const parseUnifiedGitDiff = (input: {
  readonly repo: string
  readonly from: string
  readonly to: string
  readonly patch: string
}): GitDiffResult => {
  const files: GitDiffFile[] = []
  let currentFile: GitDiffFile | undefined
  let currentHunk: GitDiffHunk | undefined

  for (const line of input.patch.split(/\r?\n/)) {
    const header = parseDiffHeader(line)
    if (header) {
      currentFile = pushCurrentFile(files, currentFile, currentHunk)
      currentHunk = undefined
      currentFile = {
        oldPath: header.oldPath,
        newPath: header.newPath,
        status: statusFor(header.oldPath, header.newPath),
        hunks: [],
      }
      continue
    }

    if (!currentFile) continue

    if (line.startsWith('rename from ')) {
      currentFile.oldPath = line.slice('rename from '.length)
      currentFile.status = statusFor(currentFile.oldPath, currentFile.newPath)
      continue
    }
    if (line.startsWith('rename to ')) {
      currentFile.newPath = line.slice('rename to '.length)
      currentFile.status = statusFor(currentFile.oldPath, currentFile.newPath)
      continue
    }
    if (line.startsWith('--- ')) {
      currentFile.oldPath = stripGitPrefix(line.slice(4).trim())
      currentFile.status = statusFor(currentFile.oldPath, currentFile.newPath)
      continue
    }
    if (line.startsWith('+++ ')) {
      currentFile.newPath = stripGitPrefix(line.slice(4).trim())
      currentFile.status = statusFor(currentFile.oldPath, currentFile.newPath)
      continue
    }

    const hunkMatch = HUNK_RE.exec(line)
    if (hunkMatch) {
      currentHunk = pushCurrentHunk(currentFile, currentHunk)
      currentHunk = {
        header: line,
        oldStart: Number(hunkMatch[1]),
        oldLines: defaultLineCount(hunkMatch[2]),
        newStart: Number(hunkMatch[3]),
        newLines: defaultLineCount(hunkMatch[4]),
        lines: [],
      }
      continue
    }

    if (!currentHunk) continue
    if (line.startsWith('+')) currentHunk.lines.push({ kind: 'add', text: line.slice(1) })
    else if (line.startsWith('-')) currentHunk.lines.push({ kind: 'remove', text: line.slice(1) })
    else if (line.startsWith(' ')) currentHunk.lines.push({ kind: 'context', text: line.slice(1) })
  }

  pushCurrentFile(files, currentFile, currentHunk)

  return GitDiffResult.parse({
    tool: GIT_DIFF_TOOL_NAME,
    repo: input.repo,
    from: input.from,
    to: input.to,
    files,
  })
}

export const parseGitDiffToolInput = (input: unknown): GitDiffToolInput =>
  GitDiffToolInput.parse(input)
export const safeParseGitDiffToolInput = (input: unknown) =>
  GitDiffToolInput.safeParse(input)
