import { describe, expect, it } from 'vitest'
import { createCircuitBreaker } from '../src/circuit-breaker.js'

const fakeClock = () => {
  let t = 1000
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms
    },
  }
}

describe('circuit breaker (#239)', () => {
  it('starts closed and stays closed under success', () => {
    const cb = createCircuitBreaker({ failureThreshold: 3, resetAfterMs: 1000 })
    expect(cb.state()).toBe('closed')
    cb.recordSuccess()
    expect(cb.state()).toBe('closed')
  })

  it('opens after consecutive failures hit the threshold', () => {
    const clock = fakeClock()
    const cb = createCircuitBreaker({ failureThreshold: 3, resetAfterMs: 1000, clock: clock.now })
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.state()).toBe('closed')
    cb.recordFailure()
    expect(cb.state()).toBe('open')
    expect(cb.tryAcquire()).toEqual({ allowed: false, state: 'open' })
  })

  it('successes reset the consecutive failure counter', () => {
    const cb = createCircuitBreaker({ failureThreshold: 3, resetAfterMs: 1000 })
    cb.recordFailure()
    cb.recordFailure()
    cb.recordSuccess()
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.state()).toBe('closed')
  })

  it('moves to half-open after the cooldown elapses', () => {
    const clock = fakeClock()
    const cb = createCircuitBreaker({ failureThreshold: 1, resetAfterMs: 500, clock: clock.now })
    cb.recordFailure()
    expect(cb.state()).toBe('open')
    expect(cb.tryAcquire()).toEqual({ allowed: false, state: 'open' })

    clock.advance(499)
    expect(cb.tryAcquire().allowed).toBe(false)

    clock.advance(2)
    const probe = cb.tryAcquire()
    expect(probe.allowed).toBe(true)
    expect(cb.state()).toBe('half-open')
  })

  it('half-open success closes the breaker; failure re-opens', () => {
    const clock = fakeClock()
    const cb = createCircuitBreaker({ failureThreshold: 1, resetAfterMs: 100, clock: clock.now })
    cb.recordFailure()
    clock.advance(150)
    cb.tryAcquire()
    cb.recordSuccess()
    expect(cb.state()).toBe('closed')

    cb.recordFailure()
    expect(cb.state()).toBe('open')
    clock.advance(150)
    cb.tryAcquire()
    expect(cb.state()).toBe('half-open')
    cb.recordFailure()
    expect(cb.state()).toBe('open')
  })

  it('respects halfOpenSuccessesToClose > 1', () => {
    const clock = fakeClock()
    const cb = createCircuitBreaker({
      failureThreshold: 1,
      resetAfterMs: 100,
      halfOpenSuccessesToClose: 2,
      clock: clock.now,
    })
    cb.recordFailure()
    clock.advance(150)
    cb.tryAcquire()
    cb.recordSuccess()
    expect(cb.state()).toBe('half-open')
    cb.recordSuccess()
    expect(cb.state()).toBe('closed')
  })
})
