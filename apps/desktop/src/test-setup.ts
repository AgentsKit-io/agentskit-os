import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Tauri API (not available in test environment)
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockRejectedValue(new Error('Tauri not available in tests')),
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(() => undefined),
}))
