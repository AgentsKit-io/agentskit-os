import { describe, expect, it } from 'vitest'
import {
  createGitDiffNodeHandler,
  GIT_DIFF_TOOL_NAME,
  GitDiffResult,
} from '../src/git-diff-tool.js'

const SAMPLE_PATCH = `diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1,2 +1,2 @@
-old
+new
`

describe('createGitDiffNodeHandler (#193)', () => {
  it('returns null for non-matching tool nodes', async () => {
    const handler = createGitDiffNodeHandler(async () => SAMPLE_PATCH)
    const out = await handler({ tool: 'tools.other' }, {})
    expect(out).toBeNull()
  })

  it('parses a raw unified patch into a GitDiffResult', async () => {
    const handler = createGitDiffNodeHandler(async () => SAMPLE_PATCH)
    const out = await handler(
      { tool: GIT_DIFF_TOOL_NAME },
      { repo: '/r', from: 'HEAD~1', to: 'HEAD' },
    )
    expect(out?.kind).toBe('ok')
    if (out?.kind === 'ok') {
      const parsed = GitDiffResult.parse(out.value)
      expect(parsed.tool).toBe(GIT_DIFF_TOOL_NAME)
      expect(parsed.files[0]?.newPath).toBe('a.ts')
    }
  })

  it('passes a structured executor result through unchanged', async () => {
    const value = GitDiffResult.parse({
      tool: GIT_DIFF_TOOL_NAME,
      repo: '/r',
      from: 'a',
      to: 'b',
      files: [],
    })
    const handler = createGitDiffNodeHandler(async () => value)
    const out = await handler(
      { tool: GIT_DIFF_TOOL_NAME },
      { repo: '/r', from: 'a', to: 'b' },
    )
    expect(out).toEqual({ kind: 'ok', value })
  })

  it('reports invalid input', async () => {
    const handler = createGitDiffNodeHandler(async () => SAMPLE_PATCH)
    const out = await handler({ tool: GIT_DIFF_TOOL_NAME }, { repo: 1 })
    expect(out?.kind).toBe('failed')
    if (out?.kind === 'failed') {
      expect(out.error.code).toBe('tools.git.diff.invalid_input')
    }
  })

  it('reports executor exceptions', async () => {
    const handler = createGitDiffNodeHandler(async () => {
      throw new Error('git missing')
    })
    const out = await handler(
      { tool: GIT_DIFF_TOOL_NAME },
      { repo: '/r', from: 'a', to: 'b' },
    )
    expect(out?.kind).toBe('failed')
    if (out?.kind === 'failed') {
      expect(out.error.code).toBe('tools.git.diff.exec_failed')
      expect(out.error.message).toContain('git missing')
    }
  })
})
