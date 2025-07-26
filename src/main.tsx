import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
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

// Create a QueryClient instance with optimized settings for activity feeds
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reduce background refetches for better performance
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as any).status
          if (status >= 400 && status < 500) return false
        }
        return failureCount < 3
      },
    },
    mutations: {
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {/* Only show devtools in development */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </React.StrictMode>,
)
