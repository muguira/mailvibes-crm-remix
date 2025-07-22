import { useStore } from '@/stores'
import { TContactProfileStore } from '@/types/store/contact-profile'

/**
 * Custom hook for accessing ContactProfile store
 *
 * Provides typed access to all ContactProfile state and actions
 * with proper TypeScript inference and optimization.
 *
 * @example
 * ```typescript
 * // Basic usage
 * const {
 *   contactProfileContact,
 *   contactProfileContactDetails,
 *   contactProfileLoading,
 *   contactProfileInitialize
 * } = useContactProfileStore();
 *
 * // Selective subscription for performance
 * const { contactProfileContact } = useContactProfileStore(
 *   (state) => ({ contactProfileContact: state.contactProfileContact })
 * );
 * ```
 */
export const useContactProfileStore = <T = TContactProfileStore>(selector?: (state: TContactProfileStore) => T): T => {
  return useStore(state => {
    // Extract all ContactProfile-related state and actions
    const contactProfileStore: TContactProfileStore = {
      // Core state
      contactProfileContact: state.contactProfileContact,
      contactProfileContactDetails: state.contactProfileContactDetails,
      contactProfileCurrentContactId: state.contactProfileCurrentContactId,
      contactProfileIsInitialized: state.contactProfileIsInitialized,
      contactProfileLastSyncAt: state.contactProfileLastSyncAt,

      // Loading states
      contactProfileLoading: state.contactProfileLoading,

      // Error states
      contactProfileErrors: state.contactProfileErrors,

      // Edit mode
      contactProfileEditMode: state.contactProfileEditMode,

      // Configuration
      contactProfileRetryConfig: state.contactProfileRetryConfig,

      // Activity and timeline
      contactProfileActivityFilters: state.contactProfileActivityFilters,
      contactProfileTimelineOptions: state.contactProfileTimelineOptions,

      // Actions
      contactProfileInitialize: state.contactProfileInitialize,
      contactProfileReset: state.contactProfileReset,
      contactProfileFetchContact: state.contactProfileFetchContact,
      contactProfileUpdateContactDetails: state.contactProfileUpdateContactDetails,
      contactProfileSetEditMode: state.contactProfileSetEditMode,
      contactProfileSetContactDetails: state.contactProfileSetContactDetails,
      contactProfileGetPrimaryEmail: state.contactProfileGetPrimaryEmail,
      contactProfileGetPrimaryPhone: state.contactProfileGetPrimaryPhone,
      contactProfileGetPrimaryAddress: state.contactProfileGetPrimaryAddress,
      contactProfileSetActivityFilters: state.contactProfileSetActivityFilters,
      contactProfileSetTimelineOptions: state.contactProfileSetTimelineOptions,
      contactProfileClearError: state.contactProfileClearError,
      contactProfileClearAllErrors: state.contactProfileClearAllErrors,
      contactProfileSetRetryConfig: state.contactProfileSetRetryConfig,
    }

    // Apply selector if provided, otherwise return full store
    return selector ? selector(contactProfileStore) : (contactProfileStore as T)
  })
}

/**
 * Selector hooks for common ContactProfile store access patterns
 * These provide optimized access to frequently used parts of the store
 */

/**
 * Hook for accessing contact profile contact data
 * Optimized for components that only need contact information
 */
export const useContactProfileContact = () => {
  return useContactProfileStore(state => ({
    contact: state.contactProfileContact,
    contactDetails: state.contactProfileContactDetails,
    loading: state.contactProfileLoading.fetching,
    error: state.contactProfileErrors.fetch,
  }))
}

/**
 * Hook for accessing contact profile loading states
 * Optimized for components that need to show loading indicators
 */
export const useContactProfileLoading = () => {
  return useContactProfileStore(state => state.contactProfileLoading)
}

/**
 * Hook for accessing contact profile error states
 * Optimized for components that need to handle errors
 */
export const useContactProfileErrors = () => {
  return useContactProfileStore(state => state.contactProfileErrors)
}

/**
 * Hook for accessing contact profile edit mode
 * Optimized for components that manage edit states
 */
export const useContactProfileEditMode = () => {
  return useContactProfileStore(state => ({
    editMode: state.contactProfileEditMode,
    setEditMode: state.contactProfileSetEditMode,
  }))
}

/**
 * Hook for accessing contact profile actions
 * Optimized for components that primarily perform actions
 */
export const useContactProfileActions = () => {
  return useContactProfileStore(state => ({
    initialize: state.contactProfileInitialize,
    reset: state.contactProfileReset,
    fetchContact: state.contactProfileFetchContact,
    updateContactDetails: state.contactProfileUpdateContactDetails,
    clearError: state.contactProfileClearError,
    clearAllErrors: state.contactProfileClearAllErrors,
  }))
}

/**
 * Hook for accessing contact profile initialization state
 * Optimized for components that need to check initialization status
 */
export const useContactProfileInitialization = () => {
  return useContactProfileStore(state => ({
    isInitialized: state.contactProfileIsInitialized,
    currentContactId: state.contactProfileCurrentContactId,
    lastSyncAt: state.contactProfileLastSyncAt,
    initialize: state.contactProfileInitialize,
    reset: state.contactProfileReset,
  }))
}

/**
 * Hook for accessing contact profile activity and timeline
 * Optimized for components that manage activity feeds and timelines
 */
export const useContactProfileTimeline = () => {
  return useContactProfileStore(state => ({
    activityFilters: state.contactProfileActivityFilters,
    timelineOptions: state.contactProfileTimelineOptions,
    setActivityFilters: state.contactProfileSetActivityFilters,
    setTimelineOptions: state.contactProfileSetTimelineOptions,
  }))
}
