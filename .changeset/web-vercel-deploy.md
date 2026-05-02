---
"@agentskit/web": minor
---

apps/web — Vercel deploy config + SEO essentials

- `vercel.json` with monorepo build/install commands and ignoreCommand
- `robots.ts`, `sitemap.ts`, `manifest.ts` (App Router metadata routes)
- Edge `opengraph-image.tsx` (1200x630, dark cyan accent)
- Centralized `lib/site.ts` for canonical URL/name/description
- `layout.tsx` enriched: title template, keywords, theme-color, dark color scheme
- `.env.example` + `apps/web/README.md` with deploy instructions
