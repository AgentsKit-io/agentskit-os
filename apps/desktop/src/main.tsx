import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@agentskit/os-ui/tokens.css'
import '@agentskit/os-ui/styles.css'
import './globals.css'
import { App } from './app'

const rootEl = document.getElementById('root')
if (rootEl === null) throw new Error('Root element not found')

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
