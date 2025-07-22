import { useAuth } from '@/components/auth'
import { useGmail } from '@/hooks/gmail'
import React, { useMemo, useRef, useState } from 'react'

/**
 * A comprehensive test component for debugging and validating Gmail hooks performance.
 *
 * This debug component is designed to detect and prevent infinite loops in Gmail hooks,
 * monitor render performance, and provide manual testing controls for Gmail integration.
 * It's specifically built for development and testing environments.
 *
 * Features:
 * - Infinite loop detection with render count monitoring
 * - Manual testing controls for Gmail operations
 * - Live performance metrics display
 * - Auto-initialize testing capabilities
 * - Console logging for debugging
 * - Visual warnings for high render counts
 * - Hook options memoization to prevent unnecessary re-renders
 *
 * Test Scenarios:
 * - Manual account loading test
 * - Auto-initialize behavior validation
 * - Render count monitoring (should stay under 50)
 * - Hook stability verification
 *
 * @example
 * ```tsx
 * // Add to a development route for testing
 * <Route path="/debug/gmail" component={GmailHookTest} />
 *
 * // Or include temporarily in app for debugging
 * {process.env.NODE_ENV === 'development' && <GmailHookTest />}
 * ```
 */
export const GmailHookTest: React.FC = () => {
  /** Current authenticated user from auth context */
  const { user } = useAuth()
  /** Whether manual testing has been initiated */
  const [testStarted, setTestStarted] = useState(false)

  /**
   * Ref to track render count without causing re-renders
   * Used to detect potential infinite loops (threshold: 50 renders)
   */
  const renderCountRef = useRef(0)
  renderCountRef.current += 1

  /**
   * Memoized Gmail hook options to prevent object recreation
   * Prevents unnecessary re-renders by maintaining reference equality
   */
  const gmailOptions = useMemo(
    () => ({
      userId: user?.id,
      autoInitialize: false, // Start with disabled to test manual control
      enableLogging: true,
    }),
    [user?.id],
  )

  /** Gmail hook instance being tested for stability and performance */
  const gmail = useGmail(gmailOptions)

  /**
   * Initiates manual testing of Gmail hook operations
   * Tests the loadAccounts function for stability and error handling
   */
  const startTest = async () => {
    setTestStarted(true)
    console.log('🧪 Starting Gmail hook test...')

    try {
      // Try to load accounts manually to test hook stability
      await gmail.loadAccounts()
      console.log('✅ loadAccounts completed without loops')
    } catch (error) {
      console.error('❌ loadAccounts failed:', error)
    }
  }

  /**
   * Tests auto-initialize behavior by reloading the page
   * This simulates component re-mounting with autoInitialize: true
   * TODO: Replace with proper re-mounting test in future iterations
   */
  const testAutoInitialize = () => {
    console.log('🧪 Testing with autoInitialize...')
    // This would require re-mounting the component with autoInitialize: true
    window.location.reload() // Temporary - just reload to test
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Gmail Hooks Test</h1>

      <div className="bg-gray-100 p-4 rounded mb-4">
        <p>
          <strong>Render Count:</strong> {renderCountRef.current}
        </p>
        <p>
          <strong>User ID:</strong> {user?.id || 'Not logged in'}
        </p>
        <p>
          <strong>Accounts:</strong> {gmail.accounts.length}
        </p>
        <p>
          <strong>Loading:</strong> {JSON.stringify(gmail.loading)}
        </p>
        <p>
          <strong>Error:</strong> {gmail.error || 'None'}
        </p>
        <p>
          <strong>Connection Status:</strong> {gmail.connectionStatus}
        </p>
      </div>

      <div className="space-y-2">
        <button
          onClick={startTest}
          disabled={testStarted}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {testStarted ? 'Test Started' : 'Start Manual Test'}
        </button>

        <button onClick={testAutoInitialize} className="bg-yellow-500 text-white px-4 py-2 rounded ml-2">
          Test Auto-Initialize (Reload)
        </button>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>• Render count should be low (under 10)</p>
        <p>• No infinite loops should occur</p>
        <p>• Console should show controlled logging</p>
      </div>

      {renderCountRef.current > 50 && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 rounded">
          <p className="text-red-700 font-bold">⚠️ HIGH RENDER COUNT DETECTED!</p>
          <p>This indicates a potential infinite loop. Check console for errors.</p>
        </div>
      )}
    </div>
  )
}
