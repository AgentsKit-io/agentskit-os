import { Activity, Bot, GitBranch, Home } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type ActiveScreen = 'dashboard' | 'traces' | 'agents' | 'runs'

export type NavItem = {
  readonly id: ActiveScreen
  readonly label: string
  readonly icon: LucideIcon
  readonly keywords?: readonly string[]
}

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'dashboard', label: 'Home', icon: Home, keywords: ['dashboard', 'overview'] },
  { id: 'agents', label: 'Agents', icon: Bot, keywords: ['workers', 'providers'] },
  { id: 'runs', label: 'Runs', icon: Activity, keywords: ['runs', 'executions', 'history'] },
  { id: 'traces', label: 'Traces', icon: GitBranch, keywords: ['spans', 'observability'] },
] as const

export function isActiveScreen(screen: string): screen is ActiveScreen {
  return NAV_ITEMS.some((item) => item.id === screen)
}

export function labelForScreen(screen: ActiveScreen): string {
  return NAV_ITEMS.find((item) => item.id === screen)?.label ?? screen
}

export function setScreenWithViewTransition(update: () => void): void {
  const viewTransitionDocument = document as Document & {
    startViewTransition?: (callback: () => void) => void
  }

  if (
    viewTransitionDocument.startViewTransition &&
    window.matchMedia('(prefers-reduced-motion: no-preference)').matches
  ) {
    try {
      viewTransitionDocument.startViewTransition(() => {
        update()
      })
    } catch {
      update()
    }
    return
  }

  update()
}
