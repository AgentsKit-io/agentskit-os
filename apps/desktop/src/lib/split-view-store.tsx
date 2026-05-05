import { createContext, useCallback, useContext, useMemo, useState } from 'react'

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
  const [open, setOpen] = useState(false)
  const [secondary, setSecondaryState] = useState<SplitScreenId>('traces')

  const toggle = useCallback(() => setOpen((v) => !v), [])
  const close = useCallback(() => setOpen(false), [])
  const setSecondary = useCallback((screen: SplitScreenId) => setSecondaryState(screen), [])
  const openWithSecondary = useCallback((screen: SplitScreenId) => {
    setSecondaryState(screen)
    setOpen(true)
  }, [])

  const value = useMemo(
    () => ({ open, secondary, toggle, close, setSecondary, openWithSecondary }),
    [open, secondary, toggle, close, setSecondary, openWithSecondary],
  )

  return <SplitViewContext.Provider value={value}>{children}</SplitViewContext.Provider>
}

export function useSplitView(): SplitViewState {
  const ctx = useContext(SplitViewContext)
  if (!ctx) throw new Error('useSplitView must be used within SplitViewProvider')
  return ctx
}

