import '@testing-library/jest-dom'
import { vi } from 'vitest'

// React 19 + @testing-library/react requires this flag at startup.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

// Mock Tauri API (not available in test environment)
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockRejectedValue(new Error('Tauri not available in tests')),
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(() => undefined),
}))
