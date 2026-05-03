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

// In-memory localStorage stub for jsdom-based tests.
const store: Record<string, string> = {}
const localStorageMock: Storage = {
  getItem: (key: string) =>
    Object.prototype.hasOwnProperty.call(store, key) ? store[key]! : null,
  setItem: (key: string, value: string) => {
    store[key] = value
  },
  removeItem: (key: string) => {
    delete store[key]
  },
  clear: () => {
    for (const key of Object.keys(store)) delete store[key]
  },
  get length() {
    return Object.keys(store).length
  },
  key: (index: number) => Object.keys(store)[index] ?? null,
}
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})
