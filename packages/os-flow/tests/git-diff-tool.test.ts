import { describe, expect, it } from 'vitest'
import {
  GIT_DIFF_TOOL_NAME,
  createGitDiffToolCall,
  parseGitDiffToolInput,
  parseUnifiedGitDiff,
} from '../src/git-diff-tool.js'

describe('git.diff tool primitive', () => {
  it('validates the canonical tool call input', () => {
    const call = createGitDiffToolCall({
      repo: '.',
      from: 'main',
      to: 'HEAD',
      paths: ['packages/os-flow'],
      contextLines: 5,
    })

    expect(call.tool).toBe(GIT_DIFF_TOOL_NAME)
    expect(call.input.paths).toEqual(['packages/os-flow'])
    expect(parseGitDiffToolInput({ repo: '.', from: 'a', to: 'b' }).contextLines).toBe(3)
  })

  it('parses unified git diff into file/hunk/line structures', () => {
    const parsed = parseUnifiedGitDiff({
      repo: '.',
      from: 'main',
      to: 'HEAD',
      patch: `diff --git a/src/a.ts b/src/a.ts
index 1111111..2222222 100644
--- a/src/a.ts
+++ b/src/a.ts
@@ -1,3 +1,4 @@
 import x from 'x'
-const value = 1
+const value = 2
+const next = true
 export { value }
diff --git a/src/new.ts b/src/new.ts
new file mode 100644
--- /dev/null
+++ b/src/new.ts
@@ -0,0 +1 @@
+export const created = true
`,
    })

    expect(parsed.files).toHaveLength(2)
    expect(parsed.files[0]).toMatchObject({
      oldPath: 'src/a.ts',
      newPath: 'src/a.ts',
      status: 'modified',
    })
    expect(parsed.files[0]?.hunks[0]?.lines).toEqual([
      { kind: 'context', text: "import x from 'x'" },
      { kind: 'remove', text: 'const value = 1' },
      { kind: 'add', text: 'const value = 2' },
      { kind: 'add', text: 'const next = true' },
      { kind: 'context', text: 'export { value }' },
    ])
    expect(parsed.files[1]).toMatchObject({
      oldPath: '/dev/null',
      newPath: 'src/new.ts',
      status: 'added',
    })
  })

  it('detects deleted and renamed files', () => {
    const parsed = parseUnifiedGitDiff({
      repo: '.',
      from: 'main',
      to: 'HEAD',
      patch: `diff --git a/src/old.ts b/src/old.ts
deleted file mode 100644
--- a/src/old.ts
+++ /dev/null
@@ -1 +0,0 @@
-export const old = true
diff --git a/src/before.ts b/src/after.ts
similarity index 90%
rename from src/before.ts
rename to src/after.ts
--- a/src/before.ts
+++ b/src/after.ts
@@ -1 +1 @@
-before
+after
`,
    })

    expect(parsed.files.map((file) => file.status)).toEqual(['deleted', 'renamed'])
    expect(parsed.files[1]?.oldPath).toBe('src/before.ts')
    expect(parsed.files[1]?.newPath).toBe('src/after.ts')
  })
})
