import { ThemeProvider } from '@agentskit/os-ui'
import { Dashboard } from './screens/dashboard'

export function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <div className="flex h-full min-h-screen flex-col bg-[var(--ag-surface)]">
        <main className="flex flex-1 flex-col overflow-auto">
          <Dashboard />
        </main>
      </div>
    </ThemeProvider>
  )
}
