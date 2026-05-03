/**
 * Vite entry point for the AgentsKitOS desktop front-end.
 *
 * TODO(#36): import '@agentskit/os-ui/tokens.css' once @agentskit/os-ui ships.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import { App } from './app'

const rootEl = document.getElementById('root')

if (!rootEl) {
  throw new Error('Fatal: #root element not found in index.html')
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
