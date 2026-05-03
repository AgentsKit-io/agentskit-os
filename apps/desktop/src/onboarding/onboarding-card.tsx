/**
 * OnboardingCard — the floating card rendered inside the tour overlay.
 * Displays step content, navigation controls, and a step counter.
 */

import { useCallback, useEffect } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Kbd,
} from '@agentskit/os-ui'
import { ONBOARDING_STEPS, type OnboardingStep } from './steps'
import { useOnboarding } from './onboarding-provider'

interface OnboardingCardProps {
  stepData: OnboardingStep
  stepIndex: number
  totalSteps: number
}

export function OnboardingCard({ stepData, stepIndex, totalSteps }: OnboardingCardProps) {
  const { next, prev, skip, finish } = useOnboarding()
  const isFirst = stepIndex === 0
  const isLast = stepIndex === totalSteps - 1

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'Enter':
          e.preventDefault()
          isLast ? finish() : next()
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (!isFirst) prev()
          break
        case 'Escape':
          e.preventDefault()
          skip()
          break
      }
    },
    [isFirst, isLast, next, prev, finish, skip],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <Card
      role="dialog"
      aria-modal="true"
      aria-label={`Onboarding step ${stepIndex + 1} of ${totalSteps}: ${stepData.title}`}
      className="relative w-[420px] max-w-[calc(100vw-2rem)] shadow-2xl"
    >
      <CardHeader className="pb-3">
        {/* Step counter */}
        <div className="mb-2 flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={[
                'h-1.5 rounded-full transition-all duration-200',
                i === stepIndex
                  ? 'w-4 bg-[var(--ag-accent)]'
                  : 'w-1.5 bg-[var(--ag-line)]',
              ].join(' ')}
              aria-hidden="true"
            />
          ))}
          <span className="ml-auto text-xs text-[var(--ag-ink-muted)]">
            {stepIndex + 1} / {totalSteps}
          </span>
        </div>

        <CardTitle>{stepData.title}</CardTitle>
      </CardHeader>

      <CardContent>
        <p className="text-sm leading-relaxed text-[var(--ag-ink-muted)]">
          {stepData.description}
        </p>

        {/* Keyboard hint */}
        <p className="mt-3 flex items-center gap-1 text-xs text-[var(--ag-ink-muted)]">
          <Kbd>←</Kbd>
          <Kbd>→</Kbd>
          <span>navigate</span>
          <span className="mx-1">·</span>
          <Kbd>Esc</Kbd>
          <span>skip</span>
        </p>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2">
        {/* Skip link — only on first step */}
        {isFirst ? (
          <button
            onClick={skip}
            className="text-xs text-[var(--ag-ink-muted)] hover:text-[var(--ag-ink)] underline-offset-2 hover:underline"
          >
            Skip tour
          </button>
        ) : (
          <Button variant="ghost" size="sm" onClick={prev} disabled={isFirst}>
            Back
          </Button>
        )}

        <Button
          variant="accent"
          size="sm"
          onClick={isLast ? finish : next}
        >
          {isLast ? 'Finish' : 'Next'}
        </Button>
      </CardFooter>
    </Card>
  )
}

export { ONBOARDING_STEPS }
