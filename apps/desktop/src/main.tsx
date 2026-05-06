import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@agentskit/os-ui/tokens.css'
import '@agentskit/os-ui/styles.css'
import '@agentskit/os-desktop/globals.css'
import { App } from '@agentskit/os-desktop'

const rootEl = document.getElementById('root')
if (rootEl === null) throw new Error('Root element not found')

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
