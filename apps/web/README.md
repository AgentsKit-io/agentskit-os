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

Project root: `apps/web`. Framework auto-detect: Next.js. Other settings live in [`vercel.json`](./vercel.json).

Required env vars:

- `NEXT_PUBLIC_SITE_URL` — canonical site URL (used by sitemap, robots, OG).

The `ignoreCommand` skips builds when no relevant files changed in `apps/web`, the lockfile, or `pnpm-workspace.yaml`.

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
