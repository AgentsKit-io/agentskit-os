# `@agentskit/os-ui`

> **Distribution tier:** `public` · **Stability:** `alpha`

shadcn-based React primitives and the Apple-inspired operational token system shared by `apps/desktop` and any embedder.

## Install

```bash
pnpm add @agentskit/os-ui react react-dom
```

Tailwind users should also add `tailwindcss` to their project.

## Usage

### 1. Import tokens

```css
/* In your global CSS */
@import "@agentskit/os-ui/tokens.css";

/* Optional: non-Tailwind embedder utilities */
@import "@agentskit/os-ui/styles.css";
```

### 2. Wrap your app with ThemeProvider

```tsx
import { ThemeProvider } from "@agentskit/os-ui";

export function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      {/* your app */}
    </ThemeProvider>
  );
}
```

### 3. Use components

```tsx
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, Kbd, Tooltip, GlassPanel } from "@agentskit/os-ui";

export function Demo() {
  return (
    <GlassPanel className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Agent Panel</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2 items-center">
          <Button variant="accent">Run</Button>
          <Badge variant="accent">Active</Badge>
          <Tooltip content="Command palette">
            <Kbd>⌘K</Kbd>
          </Tooltip>
        </CardContent>
      </Card>
    </GlassPanel>
  );
}
```

## Theme tokens

| Token | Dark | Light | Description |
|---|---|---|---|
| `--ag-surface` | `#08090c` | `#ffffff` | App background |
| `--ag-surface-alt` | `#0d0e12` | `#f5f5f7` | Alternate surface |
| `--ag-surface-dim` | `#0a0b0e` | `#fafafa` | Dimmed surface |
| `--ag-panel` | `#111217` | `#f0f0f2` | Card / panel background |
| `--ag-panel-alt` | `#16171d` | `#e8e8ec` | Alternate panel |
| `--ag-line` | `#1f2025` | `#d4d4d8` | Border / separator |
| `--ag-line-soft` | `#141519` | `#e4e4e7` | Subtle border |
| `--ag-ink` | `#f5f5f7` | `#09090b` | Primary text |
| `--ag-ink-muted` | `#a1a1aa` | `#52525b` | Secondary text |
| `--ag-ink-subtle` | `#71717a` | `#71717a` | Tertiary text |
| `--ag-accent` | `#22d3ee` | `#0891b2` | Cyan accent |
| `--ag-accent-hover` | `#67e8f9` | `#0e7490` | Accent hover state |
| `--ag-accent-dim` | `#0e7490` | `#cffafe` | Dim accent / badge bg |

## Components

| Component | Description |
|---|---|
| `Button` | Variants: `primary`, `accent`, `ghost`, `outline`, `link`. Sizes: `sm`, `md`, `lg`. |
| `Card` + sub-parts | `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` |
| `Badge` | Variants: `default`, `outline`, `accent` |
| `Kbd` | Keyboard shortcut chip |
| `Tooltip` | Lightweight accessible tooltip (no Radix dependency) |
| `GlassPanel` | Frosted-glass surface. Blur levels: `sm`, `md`, `lg` |
| `ThemeProvider` | Context provider; exposes `useTheme()`. Supports `dark`, `light`, `system` |

## Theming

Set `data-theme="dark"` or `data-theme="light"` on `<html>` (done automatically by `ThemeProvider`) or override any `--ag-*` variable in your own CSS.

## License

MIT
