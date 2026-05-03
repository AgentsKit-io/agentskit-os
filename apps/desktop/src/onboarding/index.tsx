/**
 * OnboardingTour — full-screen overlay that renders the active step card.
 *
 * The overlay uses a soft scrim (GlassPanel) as backdrop. Clicking the scrim
 * does NOT advance the tour; only the explicit navigation buttons or keyboard
 * shortcuts do.
 */

import { createPortal } from 'react-dom'
import { GlassPanel } from '@agentskit/os-ui'
import { useOnboarding } from './onboarding-provider'
import { OnboardingCard } from './onboarding-card'
import { ONBOARDING_STEPS } from './steps'

export function OnboardingTour() {
  const { active, step } = useOnboarding()

  if (!active) return null

  const stepData = ONBOARDING_STEPS[step]
  if (!stepData) return null

  return createPortal(
    <>
      {/* Scrim — captures pointer events so the UI below is inert */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-black/50"
        // Intentionally does NOT advance the tour on click
      />

      {/* Glass backdrop + centered card */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <GlassPanel
          blur="sm"
          className="pointer-events-auto"
        >
          <OnboardingCard
            stepData={stepData}
            stepIndex={step}
            totalSteps={ONBOARDING_STEPS.length}
          />
        </GlassPanel>
      </div>
    </>,
    document.body,
  )
}
