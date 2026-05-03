---
"@agentskit/web": minor
---

apps/web — fumadocs-powered `/docs` with full coverage of shipping + planned packages

- Integrates `fumadocs-mdx` + `fumadocs-ui` at `/docs`, replaces the previous placeholder
- `source.config.ts`, `lib/source.ts`, `mdx-components.tsx`, search API route
- 30+ MDX pages: get-started, philosophy, architecture, packages (12 shipping + 10 planned), flow, security, roadmap, ADRs, RFCs
- Tailwind preset wired so dark cyan accent and fumadocs theme coexist
- `.source` added to `.gitignore` (fumadocs-mdx generates this dir)
