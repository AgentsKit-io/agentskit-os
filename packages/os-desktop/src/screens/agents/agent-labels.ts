import type { AgentProvider, AgentStatus } from './use-agents'

export const AGENT_STATUS_LABEL: Record<AgentStatus, string> = {
  ready: 'Ready',
  busy: 'Busy',
  offline: 'Offline',
  needs_auth: 'Needs auth',
}

export const AGENT_PROVIDER_LABEL: Record<AgentProvider, string> = {
  codex: 'Codex',
  claude: 'Claude',
  cursor: 'Cursor',
  gemini: 'Gemini',
}
