/**
 * OnboardingProvider — exposes useOnboarding() context with tour state and controls.
 * Reads localStorage on mount; activates tour after 200 ms if not yet completed.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { ONBOARDING_STEPS } from './steps'
import {
  markOnboardingComplete,
  readOnboardingStore,
  resetOnboardingStore,
} from './use-onboarding-store'

export interface OnboardingContextValue {
  /** Whether the tour overlay is currently visible */
  active: boolean
  /** 0-based index of the current step */
  step: number
  /** Advance to the next step (or finish if on the last step) */
  next: () => void
  /** Go back to the previous step */
  prev: () => void
  /** Complete and hide the tour */
  finish: () => void
  /** Skip the tour (same as finish, semantically "not now") */
  skip: () => void
  /** Re-arm the tour from step 0 */
  restart: () => void
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const store = readOnboardingStore()
    if (!store.completed) {
      timerRef.current = setTimeout(() => setActive(true), 200)
    }
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [])

  const finish = useCallback(() => {
    markOnboardingComplete()
    setActive(false)
    setStep(0)
  }, [])

  const skip = useCallback(() => {
    markOnboardingComplete()
    setActive(false)
    setStep(0)
  }, [])

  const next = useCallback(() => {
    setStep((s) => {
      if (s >= ONBOARDING_STEPS.length - 1) {
        markOnboardingComplete()
        setActive(false)
        return 0
      }
      return s + 1
    })
  }, [])

  const prev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1))
  }, [])

  const restart = useCallback(() => {
    resetOnboardingStore()
    setStep(0)
    setActive(true)
  }, [])

  return (
    <OnboardingContext.Provider value={{ active, step, next, prev, finish, skip, restart }}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext)
  if (!ctx) {
    throw new Error('useOnboarding must be used within <OnboardingProvider>')
  }
  return ctx
}
