---
"@agentskit/web": patch
---

apps/web — drop custom Vercel `ignoreCommand`

`turbo-ignore` is deprecated; Vercel now recommends its built-in
monorepo skipping (Root Directory + Turborepo dep graph). README updated
with the dashboard settings to use instead.
