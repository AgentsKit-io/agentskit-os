# @agentskit/web

## 0.1.0-alpha.0

### Minor Changes

- 1c6e75a: apps/web — fumadocs-powered `/docs` with full coverage of shipping + planned packages

  - Integrates `fumadocs-mdx` + `fumadocs-ui` at `/docs`, replaces the previous placeholder
  - `source.config.ts`, `lib/source.ts`, `mdx-components.tsx`, search API route
  - 30+ MDX pages: get-started, philosophy, architecture, packages (12 shipping + 10 planned), flow, security, roadmap, ADRs, RFCs
  - Tailwind preset wired so dark cyan accent and fumadocs theme coexist
  - `.source` added to `.gitignore` (fumadocs-mdx generates this dir)

- 458e45c: apps/web — Vercel deploy config + SEO essentials

  - `vercel.json` with monorepo build/install commands and ignoreCommand
  - `robots.ts`, `sitemap.ts`, `manifest.ts` (App Router metadata routes)
  - Edge `opengraph-image.tsx` (1200x630, dark cyan accent)
  - Centralized `lib/site.ts` for canonical URL/name/description
  - `layout.tsx` enriched: title template, keywords, theme-color, dark color scheme
  - `.env.example` + `apps/web/README.md` with deploy instructions

### Patch Changes

- 637a188: apps/web — drop custom Vercel `ignoreCommand`

  `turbo-ignore` is deprecated; Vercel now recommends its built-in
  monorepo skipping (Root Directory + Turborepo dep graph). README updated
  with the dashboard settings to use instead.

- 63b6706: apps/web — fix Vercel ignoreCommand to handle shallow clones

  Replace the hand-rolled `git diff --quiet HEAD^ HEAD …` with `turbo-ignore`,
  which is monorepo-aware and degrades correctly when Vercel performs a
  shallow clone (the previous command falsely returned exit 0 → skip on the
  first build after merge).
