import React, { useEffect, useState, useRef, useMemo } from 'react'
import { useGmail } from '@/hooks/gmail'
import { useAuth } from '@/components/auth'

/**
 * Test component to verify Gmail hooks don't cause infinite loops
 * This should be temporarily added to a safe route for testing
 */
export const GmailHookTest: React.FC = () => {
  const { user } = useAuth()
  const [testStarted, setTestStarted] = useState(false)

  // Use useRef to count renders without causing re-renders
  const renderCountRef = useRef(0)
  renderCountRef.current += 1

  // Memoize Gmail hook options to prevent recreating the object
  const gmailOptions = useMemo(
    () => ({
      userId: user?.id,
      autoInitialize: false, // Start with disabled
      enableLogging: true,
    }),
    [user?.id],
  )

  // Test useGmail hook with autoInitialize disabled
  const gmail = useGmail(gmailOptions)

  // Manual test controls
  const startTest = async () => {
    setTestStarted(true)
    console.log('🧪 Starting Gmail hook test...')

    try {
      // Try to load accounts manually
      await gmail.loadAccounts()
      console.log('✅ loadAccounts completed without loops')
    } catch (error) {
      console.error('❌ loadAccounts failed:', error)
    }
  }

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
