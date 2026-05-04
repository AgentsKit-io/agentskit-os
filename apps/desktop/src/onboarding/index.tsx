/**
 * OnboardingTour — driver.js guided tour anchored to real shell surfaces.
 */

import { useEffect } from 'react'
import { driver } from 'driver.js'
import type { Config, DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useOnboarding } from './onboarding-provider'
import { ONBOARDING_STEPS } from './steps'

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

const buildDriverSteps = (): DriveStep[] =>
  ONBOARDING_STEPS.map((step) => ({
    element: step.target,
    popover: {
      title: step.title,
      description: step.description,
      side: step.side ?? 'right',
      align: step.align ?? 'center',
    },
    disableActiveInteraction: true,
  }))

export function OnboardingTour() {
  const { active, step, next, prev, finish, skip } = useOnboarding()

  useEffect(() => {
    if (!active) return undefined

    const driverConfig: Config = {
      steps: buildDriverSteps(),
      animate: !prefersReducedMotion(),
      allowClose: true,
      allowKeyboardControl: true,
      disableActiveInteraction: true,
      doneBtnText: 'Finish',
      nextBtnText: 'Next',
      overlayClickBehavior: 'close',
      overlayOpacity: 0.62,
      popoverClass: 'agentskitos-driver',
      prevBtnText: 'Back',
      progressText: '{{current}} / {{total}}',
      showButtons: ['previous', 'next', 'close'],
      showProgress: true,
      smoothScroll: true,
      stagePadding: 8,
      stageRadius: 8,
    }

    const driverObj = driver({
      ...driverConfig,
      onNextClick: (_element, _activeStep, { driver: activeDriver }) => {
        if (activeDriver.isLastStep()) {
          finish()
          activeDriver.destroy()
          return
        }
        next()
        activeDriver.moveNext()
      },
      onPrevClick: (_element, _activeStep, { driver: activeDriver }) => {
        prev()
        activeDriver.movePrevious()
      },
      onCloseClick: (_element, _activeStep, { driver: activeDriver }) => {
        skip()
        activeDriver.destroy()
      },
    })

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      skip()
      driverObj.destroy()
    }

    window.addEventListener('keydown', handleEscape)
    driverObj.drive(step)

    return () => {
      window.removeEventListener('keydown', handleEscape)
      driverObj.destroy()
    }
  }, [active, finish, next, prev, skip])

  return null
}

export { ONBOARDING_STEPS }
