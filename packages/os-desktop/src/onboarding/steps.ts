/**
 * Onboarding tour step definitions.
 */

export interface OnboardingStep {
  /** Unique identifier */
  id: string
  /** Stable selector for the UI surface highlighted by driver.js */
  target: string
  /** Card headline */
  title: string
  /** Card body copy */
  description: string
  /** Preferred popover placement for the highlighted target */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Preferred popover alignment for the highlighted target */
  align?: 'start' | 'center' | 'end'
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    target: '[data-onboarding-target="sidebar"]',
    title: 'Welcome to AgentsKit OS',
    description:
      'This quick tour shows you the key areas of the desktop shell. ' +
      'Use the arrow keys or buttons below to navigate, or press Esc to skip.',
    side: 'right',
    align: 'start',
  },
  {
    id: 'dashboard',
    target: '[data-onboarding-target="nav-dashboard"]',
    title: 'Dashboard',
    description:
      'Live cost, recent runs, and the event feed all live here. ' +
      'Metrics update in real-time as your agents run.',
    side: 'right',
    align: 'center',
  },
  {
    id: 'traces',
    target: '[data-onboarding-target="nav-traces"]',
    title: 'Traces',
    description:
      'Click Traces in the sidebar to inspect spans and replay runs (#206). ' +
      'Every tool call, LLM response, and cost delta is captured.',
    side: 'right',
    align: 'center',
  },
  {
    id: 'command-palette',
    target: '[data-onboarding-target="command-palette"]',
    title: 'Command Palette',
    description:
      'Press Cmd+K (Ctrl+K on Linux/Windows) any time to open the command palette. ' +
      'Search agents, flows, settings, and more without leaving the keyboard.',
    side: 'bottom',
    align: 'end',
  },
  {
    id: 'sample-flow',
    target: '[data-onboarding-target="nav-examples"]',
    title: 'Run a Sample Flow',
    description:
      'Try a dry-run flow to see the runtime in action. ' +
      'If os-headless is available, a tiny sample will execute now — otherwise you will see a stub result in the event feed.',
    side: 'right',
    align: 'center',
  },
]
