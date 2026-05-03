# @agentskit/web

Marketing site + landing for AgentsKitOS. Next.js 15 App Router + Tailwind + shadcn-style primitives.

## Develop

```bash
pnpm --filter @agentskit/web dev
# http://localhost:3031
```

## Build

```bash
pnpm --filter @agentskit/web build
pnpm --filter @agentskit/web start
```

## Deploy (Vercel)

In the Vercel dashboard:

1. **Root Directory**: `apps/web`
2. **Include source files outside of the Root Directory in the Build Step**: ON (lets workspace packages resolve)
3. Framework auto-detects as Next.js. Build/install commands come from [`vercel.json`](./vercel.json).

Required env vars:

- `NEXT_PUBLIC_SITE_URL` — canonical site URL (used by sitemap, robots, OG).

Vercel's built-in monorepo skipping handles "did anything affecting this project change?" via the Root Directory + Turborepo dep graph. No custom `ignoreCommand` needed.

## Structure

```
app/
  layout.tsx              # metadata + fonts + theme
  page.tsx                # landing
  docs/page.tsx           # placeholder, replaced by fumadocs later
  opengraph-image.tsx     # auto OG via @vercel/og
  robots.ts · sitemap.ts · manifest.ts
components/
  nav · hero · trust-strip · flow-svg · wedge · features
  personas · architecture · quickstart · roadmap · waitlist · footer
  ui/button.tsx
lib/
  site.ts                 # canonical site constants
  utils.ts                # cn()
```
