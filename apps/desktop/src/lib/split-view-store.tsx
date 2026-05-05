import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type SplitScreenId =
  | 'dashboard'
  | 'flows'
  | 'runs'
  | 'traces'
  | 'agents'
  | 'hitl'
  | 'triggers'
  | 'evals'
  | 'benchmark'
  | 'cost'
  | 'security'

export type PersistedSplitView = {
  readonly open: boolean
  readonly secondary: SplitScreenId
}

const VALID_SECONDARIES: ReadonlySet<SplitScreenId> = new Set<SplitScreenId>([
  'dashboard',
  'flows',
  'runs',
  'traces',
  'agents',
  'hitl',
  'triggers',
  'evals',
  'benchmark',
  'cost',
  'security',
])

const STORAGE_KEY = 'agentskit:split-view'
const DEFAULT_STATE: PersistedSplitView = { open: false, secondary: 'traces' }

const isSplitScreenId = (value: unknown): value is SplitScreenId =>
  typeof value === 'string' && VALID_SECONDARIES.has(value as SplitScreenId)

export const readSplitView = (): PersistedSplitView => {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_STATE
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return DEFAULT_STATE
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const open = parsed['open'] === true
    const secondary = isSplitScreenId(parsed['secondary']) ? parsed['secondary'] : DEFAULT_STATE.secondary
    return { open, secondary }
  } catch {
    return DEFAULT_STATE
  }
}

export const writeSplitView = (state: PersistedSplitView): void => {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // non-fatal — state still applies in memory.
  }
}

type SplitViewState = {
  readonly open: boolean
  readonly secondary: SplitScreenId
  readonly toggle: () => void
  readonly close: () => void
  readonly openWithSecondary: (screen: SplitScreenId) => void
  readonly setSecondary: (screen: SplitScreenId) => void
}

const SplitViewContext = createContext<SplitViewState | null>(null)

export function SplitViewProvider({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  const [state, setState] = useState<PersistedSplitView>(() => readSplitView())

  useEffect(() => {
    writeSplitView(state)
  }, [state])

  const toggle = useCallback(() => setState((s) => ({ ...s, open: !s.open })), [])
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), [])
  const setSecondary = useCallback(
    (screen: SplitScreenId) => setState((s) => ({ ...s, secondary: screen })),
    [],
  )
  const openWithSecondary = useCallback(
    (screen: SplitScreenId) => setState({ open: true, secondary: screen }),
    [],
  )

  const value = useMemo(
    () => ({
      open: state.open,
      secondary: state.secondary,
      toggle,
      close,
      setSecondary,
      openWithSecondary,
    }),
    [state.open, state.secondary, toggle, close, setSecondary, openWithSecondary],
  )

  return <SplitViewContext.Provider value={value}>{children}</SplitViewContext.Provider>
}

export function useSplitView(): SplitViewState {
  const ctx = useContext(SplitViewContext)
  if (!ctx) throw new Error('useSplitView must be used within SplitViewProvider')
  return ctx
}
