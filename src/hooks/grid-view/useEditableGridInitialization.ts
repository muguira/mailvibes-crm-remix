import { useEffect, useState, useRef } from 'react'
import { useStore } from '@/stores'
import { renderSocialLink } from '@/components/grid-view/RenderSocialLink'
import { toast } from '@/components/ui/use-toast'
import { User } from '@supabase/supabase-js'

/**
 * Custom hook for handling grid initialization
 *
 * Manages the complex three-step initialization process:
 * 1. Initialize grid state through Zustand slice
 * 2. Load stored columns with render functions (if user authenticated)
 * 3. Load hidden columns configuration
 *
 * @param user - The authenticated user object
 * @param renderNameLink - Function to render name column with link
 * @returns {Object} Initialization state and error information
 *
 * @example
 * ```tsx
 * const renderNameLink = (value: any, row: any) => (
 *   <Link to={`/stream-view/${row.id}`} className="text-primary hover:underline">
 *     {value}
 *   </Link>
 * );
 * const { isInitialized, initializationError } = useEditableGridInitialization(user, renderNameLink);
 * ```
 */
export const useEditableGridInitialization = (
  user: User | null,
  renderNameLink?: (value: any, row: any) => React.ReactElement,
) => {
  const [isInitialized, setIsInitialized] = useState(false)
  const [initializationError, setInitializationError] = useState<string | null>(null)
  const hasInitializedRef = useRef(false) // Use ref to avoid dependency issues
  const currentUserIdRef = useRef<string | null>(null)

  // Get store functions
  const { editableLeadsGridInitialize, editableLeadsGridLoadStoredColumns, editableLeadsGridLoadHiddenColumns } =
    useStore()

  useEffect(() => {
    let isMounted = true

    /**
     * Async initialization function to set up grid state
     * Performs three-step initialization process with error handling
     */
    const initializeGrid = async () => {
      if (!isMounted) return

      // Check if we need to initialize (user changed or first time)
      const userId = user?.id || null
      const needsFullInitialization = !hasInitializedRef.current || currentUserIdRef.current !== userId

      if (!needsFullInitialization) {
        console.log('🔄 Grid already initialized for this user, but applying render functions...')

        // Still need to apply render functions even if grid is initialized
        if (renderNameLink && isMounted) {
          const { columns, editableLeadsGridApplyRenderFunctions } = useStore.getState()
          if (columns.length > 0) {
            console.log('🔗 Applying render functions to existing columns (no full init needed)...')
            editableLeadsGridApplyRenderFunctions(renderSocialLink, renderNameLink)
          }
        }

        // Mark as initialized if not already
        if (!isInitialized) {
          setIsInitialized(true)
        }
        return
      }

      try {
        setInitializationError(null)
        setIsInitialized(false)
        hasInitializedRef.current = true
        currentUserIdRef.current = userId

        console.log('🚀 Starting grid initialization process...', { userId })

        // Step 1: Initialize grid state through slice
        await editableLeadsGridInitialize(user)

        if (!isMounted) return

        // Verify initialization succeeded
        const { lastInitialization } = useStore.getState()
        if (!lastInitialization || lastInitialization.status === 'error') {
          throw new Error('Grid initialization failed')
        }

        // Step 2: Apply render functions to existing columns (always needed)
        if (renderNameLink && isMounted) {
          // First, apply renderCell functions to existing columns (from localStorage or default)
          const { columns, editableLeadsGridApplyRenderFunctions } = useStore.getState()
          if (columns.length > 0) {
            console.log('🔗 Applying render functions to existing columns...')
            editableLeadsGridApplyRenderFunctions(renderSocialLink, renderNameLink)
          }

          // Then, if user is authenticated, also load from Supabase for sync
          if (user) {
            await editableLeadsGridLoadStoredColumns(user, renderSocialLink, renderNameLink)
          }
        }

        if (!isMounted) return

        // Step 3: Load hidden columns as part of initialization
        await editableLeadsGridLoadHiddenColumns(user)

        if (isMounted) {
          setIsInitialized(true)
          console.log('✅ Complete grid initialization process completed')
        }
      } catch (error) {
        console.error('❌ Grid initialization process failed:', error)
        hasInitializedRef.current = false // Reset so it can be retried

        if (isMounted) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error'
          setInitializationError(errorMessage)

          toast({
            title: 'Initialization Error',
            description: 'Failed to initialize grid. Please refresh the page.',
            variant: 'destructive',
          })
        }
      }
    }

    // Reset initialization state when user changes
    const userId = user?.id || null
    if (currentUserIdRef.current !== userId) {
      hasInitializedRef.current = false
      setIsInitialized(false)
      setInitializationError(null)
    }

    // Run initialization
    initializeGrid()

    return () => {
      isMounted = false
    }
  }, [
    user?.id,
    renderNameLink,
    editableLeadsGridInitialize,
    editableLeadsGridLoadStoredColumns,
    editableLeadsGridLoadHiddenColumns,
  ])

  return {
    isInitialized,
    initializationError,
  }
}
