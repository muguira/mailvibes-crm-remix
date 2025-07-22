import { enableMapSet } from 'immer'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './services/google/tokenDiagnostics'
import './utils/debug-emails' // Make debug function available globally
import { initializeHiddenColumnsDebug } from './utils/debugHiddenColumns'
import './utils/timelineDebug' // Make timeline debug functions available globally

// ✅ DEBUGGING: Import repair utility for console access
if (import.meta.env.DEV) {
  import('./utils/repair-message-ids')
}

// Enable Immer MapSet plugin for Set/Map support in Zustand store
enableMapSet()

// Initialize debug utilities
initializeHiddenColumnsDebug()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
