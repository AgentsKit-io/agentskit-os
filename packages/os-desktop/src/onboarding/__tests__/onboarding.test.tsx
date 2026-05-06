/**
 * Integration tests for the driver.js-backed onboarding tour.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, act, fireEvent, within } from '@testing-library/react'
import React from 'react'

const driverMock = vi.hoisted(() => ({
  factory: vi.fn(),
}))

vi.mock('driver.js', () => ({
  driver: driverMock.factory,
}))

vi.mock('driver.js/dist/driver.css', () => ({}))

driverMock.factory.mockImplementation((config: Record<string, any>) => {
  let activeIndex = 0
  let dialog: HTMLElement | null = null

  const removeDialog = (): void => {
    dialog?.remove()
    dialog = null
  }

  const driverObj = {
    isActive: () => dialog !== null,
    refresh: () => undefined,
    drive: (stepIndex = 0) => {
      activeIndex = stepIndex
      renderDialog()
    },
    setConfig: () => undefined,
    setSteps: () => undefined,
    getConfig: () => config,
    getState: () => ({ activeIndex }),
    getActiveIndex: () => activeIndex,
    isFirstStep: () => activeIndex === 0,
    isLastStep: () => activeIndex === config.steps.length - 1,
    getActiveStep: () => config.steps[activeIndex],
    getActiveElement: () => undefined,
    getPreviousElement: () => undefined,
    getPreviousStep: () => undefined,
    moveNext: () => {
      activeIndex = Math.min(activeIndex + 1, config.steps.length - 1)
      renderDialog()
    },
    movePrevious: () => {
      activeIndex = Math.max(activeIndex - 1, 0)
      renderDialog()
    },
    moveTo: (index: number) => {
      activeIndex = index
      renderDialog()
    },
    hasNextStep: () => activeIndex < config.steps.length - 1,
    hasPreviousStep: () => activeIndex > 0,
    highlight: () => undefined,
    destroy: removeDialog,
  }

  function hookOptions() {
    return {
      config,
      state: { activeIndex },
      driver: driverObj,
    }
  }

  function renderDialog(): void {
    removeDialog()

    const step = config.steps[activeIndex]
    dialog = document.createElement('section')
    dialog.setAttribute('role', 'dialog')
    dialog.setAttribute('aria-modal', 'true')

    const title = document.createElement('h2')
    title.textContent = step.popover.title
    dialog.appendChild(title)

    const description = document.createElement('p')
    description.textContent = step.popover.description
    dialog.appendChild(description)

    const progress = document.createElement('span')
    progress.textContent = `${activeIndex + 1} / ${config.steps.length}`
    dialog.appendChild(progress)

    const closeButton = document.createElement('button')
    closeButton.type = 'button'
    closeButton.textContent = 'Skip tour'
    closeButton.addEventListener('click', () => {
      config.onCloseClick(undefined, step, hookOptions())
    })
    dialog.appendChild(closeButton)

    const previousButton = document.createElement('button')
    previousButton.type = 'button'
    previousButton.textContent = 'Back'
    previousButton.disabled = activeIndex === 0
    previousButton.addEventListener('click', () => {
      config.onPrevClick(undefined, step, hookOptions())
    })
    dialog.appendChild(previousButton)

    const nextButton = document.createElement('button')
    nextButton.type = 'button'
    nextButton.textContent = activeIndex === config.steps.length - 1 ? 'Finish' : 'Next'
    nextButton.addEventListener('click', () => {
      config.onNextClick(undefined, step, hookOptions())
    })
    dialog.appendChild(nextButton)

    document.body.appendChild(dialog)
  }

  return driverObj
})

async function renderTour() {
  const { OnboardingProvider } = await import('../onboarding-provider')
  const { OnboardingTour } = await import('../index')

  return render(
    <OnboardingProvider>
      <aside data-onboarding-target="sidebar">Sidebar</aside>
      <button data-onboarding-target="nav-dashboard">Dashboard</button>
      <button data-onboarding-target="nav-traces">Traces</button>
      <span data-onboarding-target="command-palette">Command palette</span>
      <button data-onboarding-target="nav-examples">Examples</button>
      <OnboardingTour />
    </OnboardingProvider>,
  )
}

describe('first-run activation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    driverMock.factory.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetModules()
    document.body.innerHTML = ''
  })

  it('shows the driver tour after 200 ms when onboarding is not completed', async () => {
    await renderTour()

    expect(screen.queryByRole('dialog')).toBeNull()

    await act(async () => {
      vi.advanceTimersByTime(250)
    })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Welcome to AgentsKit OS')).toBeInTheDocument()
    expect(driverMock.factory).toHaveBeenCalledOnce()
  })

  it('does not show the tour when onboarding is already completed', async () => {
    const { markOnboardingComplete } = await import('../use-onboarding-store')
    markOnboardingComplete()

    await renderTour()

    await act(async () => {
      vi.advanceTimersByTime(500)
    })

    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('navigation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetModules()
    document.body.innerHTML = ''
  })

  it('advances and goes back with driver controls', async () => {
    await renderTour()

    await act(async () => {
      vi.advanceTimersByTime(250)
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
    })

    expect(within(screen.getByRole('dialog')).getByText('Dashboard')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /back/i }))
    })

    expect(within(screen.getByRole('dialog')).getByText('Welcome to AgentsKit OS')).toBeInTheDocument()
  })
})

describe('skip and finish', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetModules()
    document.body.innerHTML = ''
  })

  it('hides the tour when Esc is pressed and marks completed', async () => {
    const { readOnboardingStore } = await import('../use-onboarding-store')

    await renderTour()

    await act(async () => {
      vi.advanceTimersByTime(250)
    })

    await act(async () => {
      fireEvent.keyDown(window, { key: 'Escape' })
    })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(readOnboardingStore().completed).toBe(true)
  })

  it('hides the tour when Skip tour is clicked', async () => {
    const { readOnboardingStore } = await import('../use-onboarding-store')

    await renderTour()

    await act(async () => {
      vi.advanceTimersByTime(250)
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /skip tour/i }))
    })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(readOnboardingStore().completed).toBe(true)
  })

  it('marks completed and hides the tour when Finish is clicked', async () => {
    const { readOnboardingStore } = await import('../use-onboarding-store')
    const { ONBOARDING_STEPS } = await import('../steps')

    await renderTour()

    await act(async () => {
      vi.advanceTimersByTime(250)
    })

    for (let i = 0; i < ONBOARDING_STEPS.length - 1; i += 1) {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /next/i }))
      })
    }

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /finish/i }))
    })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(readOnboardingStore().completed).toBe(true)
  })
})

describe('restart', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetModules()
    document.body.innerHTML = ''
  })

  it('re-arms the driver tour from step 0', async () => {
    const { OnboardingProvider, useOnboarding } = await import('../onboarding-provider')
    const { OnboardingTour } = await import('../index')
    const { markOnboardingComplete } = await import('../use-onboarding-store')

    markOnboardingComplete()

    function RestartTrigger() {
      const { restart } = useOnboarding()
      React.useEffect(() => {
        restart()
      }, [restart])
      return null
    }

    render(
      <OnboardingProvider>
        <aside data-onboarding-target="sidebar">Sidebar</aside>
        <button data-onboarding-target="nav-dashboard">Dashboard</button>
        <button data-onboarding-target="nav-traces">Traces</button>
        <span data-onboarding-target="command-palette">Command palette</span>
        <button data-onboarding-target="nav-examples">Examples</button>
        <RestartTrigger />
        <OnboardingTour />
      </OnboardingProvider>,
    )

    await act(async () => {
      vi.advanceTimersByTime(0)
    })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Welcome to AgentsKit OS')).toBeInTheDocument()
  })
})
