import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@agentskit/os-ui/tokens.css'
import '@agentskit/os-ui/styles.css'
import './globals.css'
import { App } from './app'
import { WindowRouter } from './multi-monitor/window-router'

const rootEl = document.getElementById('root')
if (rootEl === null) throw new Error('Root element not found')

createRoot(rootEl).render(
  <StrictMode>
    {/* WindowRouter checks ?screen= and renders the appropriate full-bleed
        screen for secondary monitor windows.  When ?screen= is absent it
        delegates to the main App shell. */}
    <WindowRouter>
      <App />
    </WindowRouter>
  </StrictMode>,
)
