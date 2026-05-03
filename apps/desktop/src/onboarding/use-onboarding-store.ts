/**
 * Persists onboarding completion state in localStorage.
 * Key: agentskitos.onboarding
 */

const STORAGE_KEY = 'agentskitos.onboarding'

export interface OnboardingStore {
  completed: boolean
  completedAt?: string
}

const DEFAULT_STORE: OnboardingStore = {
  completed: false,
}

export function readOnboardingStore(): OnboardingStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_STORE }
    return JSON.parse(raw) as OnboardingStore
  } catch {
    return { ...DEFAULT_STORE }
  }
}

export function writeOnboardingStore(data: OnboardingStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // ignore storage errors (e.g. private browsing quota)
  }
}

export function markOnboardingComplete(): void {
  writeOnboardingStore({ completed: true, completedAt: new Date().toISOString() })
}

export function resetOnboardingStore(): void {
  writeOnboardingStore({ completed: false })
}
