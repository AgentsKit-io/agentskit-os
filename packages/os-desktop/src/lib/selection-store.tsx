import { createContext, useCallback, useContext, useMemo, useState } from 'react'

type SelectionState = {
  readonly selectedRunId: string | null
  readonly selectedTraceId: string | null
  readonly setSelectedRunId: (id: string | null) => void
  readonly setSelectedTraceId: (id: string | null) => void
}

const SelectionContext = createContext<SelectionState | null>(null)

export function SelectionProvider({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  const [selectedRunId, setSelectedRunIdState] = useState<string | null>(null)
  const [selectedTraceId, setSelectedTraceIdState] = useState<string | null>(null)

  const setSelectedRunId = useCallback((id: string | null) => setSelectedRunIdState(id), [])
  const setSelectedTraceId = useCallback((id: string | null) => setSelectedTraceIdState(id), [])

  const value = useMemo(
    () => ({ selectedRunId, selectedTraceId, setSelectedRunId, setSelectedTraceId }),
    [selectedRunId, selectedTraceId, setSelectedRunId, setSelectedTraceId],
  )

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>
}

export function useSelection(): SelectionState {
  const ctx = useContext(SelectionContext)
  if (!ctx) throw new Error('useSelection must be used within SelectionProvider')
  return ctx
}

