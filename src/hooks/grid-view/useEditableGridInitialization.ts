import { useEffect, useState } from 'react'
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

      try {
        setInitializationError(null)
        setIsInitialized(false)

        // Step 1: Initialize grid state through slice
        await editableLeadsGridInitialize(user)

        // Verify initialization succeeded
        const { lastInitialization } = useStore.getState()
        if (!lastInitialization || lastInitialization.status === 'error') {
          throw new Error('Grid initialization failed')
        }

        // Step 2: Load stored columns with render functions (only if user is authenticated)
        if (user && renderNameLink) {
          await editableLeadsGridLoadStoredColumns(user, renderSocialLink, renderNameLink)
        }

        // Step 3: Load hidden columns as part of initialization
        await editableLeadsGridLoadHiddenColumns(user)

        if (isMounted) {
          setIsInitialized(true)
          console.log('✅ Complete grid initialization process completed')
        }
      } catch (error) {
        console.error('❌ Grid initialization process failed:', error)

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

    initializeGrid()

    return () => {
      isMounted = false
    }
  }, [
    user,
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
