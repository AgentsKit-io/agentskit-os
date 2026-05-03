---
"@agentskit/web": patch
---

apps/web — fix Vercel ignoreCommand to handle shallow clones

Replace the hand-rolled `git diff --quiet HEAD^ HEAD …` with `turbo-ignore`,
which is monorepo-aware and degrades correctly when Vercel performs a
shallow clone (the previous command falsely returned exit 0 → skip on the
first build after merge).
