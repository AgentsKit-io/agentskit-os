/**
 * Onboarding tour step definitions.
 */

export interface OnboardingStep {
  /** Unique identifier */
  id: string
  /** Card headline */
  title: string
  /** Card body copy */
  description: string
  /**
   * Optional sidebar nav item / screen this step is anchoring to.
   * Used by OnboardingCard to highlight the target area.
   */
  anchor?: 'dashboard' | 'traces' | 'command-palette' | 'sample-flow'
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to AgentsKit OS',
    description:
      'This quick tour shows you the key areas of the desktop shell. ' +
      'Use the arrow keys or buttons below to navigate, or press Esc to skip.',
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    description:
      'Live cost, recent runs, and the event feed all live here. ' +
      'Metrics update in real-time as your agents run.',
    anchor: 'dashboard',
  },
  {
    id: 'traces',
    title: 'Traces',
    description:
      'Click Traces in the sidebar to inspect spans and replay runs (#206). ' +
      'Every tool call, LLM response, and cost delta is captured.',
    anchor: 'traces',
  },
  {
    id: 'command-palette',
    title: 'Command Palette',
    description:
      'Press Cmd+K (Ctrl+K on Linux/Windows) any time to open the command palette. ' +
      'Search agents, flows, settings, and more without leaving the keyboard.',
    anchor: 'command-palette',
  },
  {
    id: 'sample-flow',
    title: 'Run a Sample Flow',
    description:
      'Try a dry-run flow to see the runtime in action. ' +
      'If os-headless is available, a tiny sample will execute now — otherwise you will see a stub result in the event feed.',
    anchor: 'sample-flow',
  },
]
