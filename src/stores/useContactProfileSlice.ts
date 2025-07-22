import { StateCreator } from 'zustand'
import { TStore } from '@/types/store/store'
import {
  TContactProfileStore,
  TEditMode,
  IContactDetails,
  TUpdateContactInput,
  IContactProfileErrorState,
  IContactProfileRetryConfig,
  IActivityFilters,
  ITimelineOptions,
} from '@/types/store/contact-profile'
import {
  INITIAL_CONTACT_PROFILE_STATE,
  RESET_CONTACT_PROFILE_STATE,
  CONTACT_PROFILE_ERROR_MESSAGES,
  CONTACT_PROFILE_SUCCESS_MESSAGES,
} from '@/constants/store/contact-profile'
import {
  transformContactToDetails,
  transformDetailsToContactUpdate,
  validateContactDetails,
  getPrimaryEmail,
  getPrimaryPhone,
  getPrimaryAddress,
  fetchContactFromSupabase,
  updateContactInSupabase,
  syncWithContactsStore,
  syncWithMockData,
} from '@/helpers/contactProfileHelpers'
import { logger } from '@/utils/logger'
import { toast } from 'sonner'

/**
 * Contact Profile slice for Zustand store
 *
 * Manages the complete contact profile lifecycle including:
 * - Contact data fetching and updating
 * - Contact details form management
 * - Edit mode states (details, experience)
 * - Timeline and activity integration
 * - Error handling and retry logic
 * - Integration with contacts store and mock data
 * - Performance optimizations with caching
 *
 * @example
 * ```typescript
 * // Usage in component
 * const {
 *   contactProfileContact,
 *   contactProfileContactDetails,
 *   contactProfileLoading,
 *   contactProfileEditMode,
 *   contactProfileInitialize,
 *   contactProfileUpdateContactDetails,
 *   contactProfileSetEditMode
 * } = useStore();
 *
 * // Initialize contact profile
 * await contactProfileInitialize("contact-123");
 *
 * // Update contact details
 * await contactProfileUpdateContactDetails({
 *   contactId: "contact-123",
 *   details: updatedDetails
 * });
 * ```
 */
export const useContactProfileSlice: StateCreator<
  TStore,
  [['zustand/subscribeWithSelector', never], ['zustand/immer', never]],
  [],
  TContactProfileStore
> = (set, get) => ({
  // Estado inicial usando las constantes
  ...INITIAL_CONTACT_PROFILE_STATE,

  /**
   * Initialize the contact profile state by fetching contact data
   * @param contactId - The ID of the contact to initialize
   * @returns Promise that resolves when initialization is complete
   */
  contactProfileInitialize: async (contactId: string) => {
    // Evitar inicializaciones duplicadas para el mismo contacto
    const currentState = get()
    if (currentState.contactProfileCurrentContactId === contactId && currentState.contactProfileIsInitialized) {
      logger.debug(`Contact profile already initialized for ${contactId}, skipping...`)
      return
    }

    set(state => {
      state.contactProfileLoading.fetching = true
      state.contactProfileErrors.fetch = null
      state.contactProfileCurrentContactId = contactId
    })

    try {
      await get().contactProfileFetchContact(contactId)

      set(state => {
        state.contactProfileIsInitialized = true
        state.contactProfileLastSyncAt = new Date().toISOString()
      })

      logger.log(`Contact profile initialized successfully for ${contactId}`)
    } catch (error) {
      logger.error('Error initializing contact profile:', error)
      const errorMessage = error instanceof Error ? error.message : CONTACT_PROFILE_ERROR_MESSAGES.FETCH_FAILED

      set(state => {
        state.contactProfileErrors.fetch = errorMessage
        state.contactProfileIsInitialized = false
      })

      toast.error(errorMessage)
    } finally {
      set(state => {
        state.contactProfileLoading.fetching = false
      })
    }
  },

  /**
   * Reset the contact profile state to its initial values
   * Clears all data, errors, and loading states
   */
  contactProfileReset: () => {
    set(state => {
      Object.assign(state, RESET_CONTACT_PROFILE_STATE)
    })
    logger.log('Contact profile state reset')
  },

  /**
   * Fetch contact data from Supabase
   * @param contactId - The ID of the contact to fetch
   */
  contactProfileFetchContact: async (contactId: string) => {
    if (!contactId) {
      const error = new Error(CONTACT_PROFILE_ERROR_MESSAGES.INVALID_CONTACT_ID)
      logger.error(error)
      throw error
    }

    set(state => {
      state.contactProfileLoading.fetching = true
      state.contactProfileErrors.fetch = null
    })

    try {
      const contact = await fetchContactFromSupabase(contactId, get().contactProfileRetryConfig)

      // Transformar los datos del contacto al formato de detalles
      const contactDetails = transformContactToDetails(contact)

      set(state => {
        state.contactProfileContact = contact
        state.contactProfileContactDetails = contactDetails
        state.contactProfileCurrentContactId = contactId
        state.contactProfileLastSyncAt = new Date().toISOString()
      })

      logger.log(`Contact fetched successfully: ${contactId}`)
    } catch (error) {
      logger.error('Error fetching contact:', error)
      const errorMessage = error instanceof Error ? error.message : CONTACT_PROFILE_ERROR_MESSAGES.FETCH_FAILED

      set(state => {
        state.contactProfileErrors.fetch = errorMessage
      })

      throw error
    } finally {
      set(state => {
        state.contactProfileLoading.fetching = false
      })
    }
  },

  /**
   * Update contact details in the database and sync with other stores
   * @param input - The contact ID and details to update
   */
  contactProfileUpdateContactDetails: async (input: TUpdateContactInput) => {
    const { contactId, details } = input
    const currentContact = get().contactProfileContact

    if (!currentContact) {
      const error = new Error(CONTACT_PROFILE_ERROR_MESSAGES.CONTACT_NOT_FOUND)
      logger.error(error)
      throw error
    }

    // Validar los detalles antes de actualizar
    const validationErrors = validateContactDetails(details)
    if (validationErrors.length > 0) {
      const errorMessage = validationErrors.join(', ')
      set(state => {
        state.contactProfileErrors.update = errorMessage
      })
      toast.error(errorMessage)
      throw new Error(errorMessage)
    }

    set(state => {
      state.contactProfileLoading.updating = true
      state.contactProfileErrors.update = null
    })

    try {
      // Transformar los detalles al formato de actualización
      const updateData = transformDetailsToContactUpdate(currentContact, details)

      // Actualizar en Supabase
      const updatedContact = await updateContactInSupabase(contactId, updateData, get().contactProfileRetryConfig)

      // Actualizar el estado local
      const updatedContactDetails = transformContactToDetails(updatedContact)

      set(state => {
        state.contactProfileContact = updatedContact
        state.contactProfileContactDetails = updatedContactDetails
        state.contactProfileEditMode = null // Cerrar el modo de edición
        state.contactProfileLastSyncAt = new Date().toISOString()
      })

      // Sincronizar con otros stores
      const syncData = {
        name: updateData.name,
        company: updateData.company,
        email: updateData.email,
        phone: updateData.phone,
        ...updateData.data,
      }

      await syncWithContactsStore(contactId, syncData)
      syncWithMockData(contactId, syncData)

      toast.success(CONTACT_PROFILE_SUCCESS_MESSAGES.UPDATE_SUCCESS)
      logger.log(`Contact details updated successfully: ${contactId}`)
    } catch (error) {
      logger.error('Error updating contact details:', error)
      const errorMessage = error instanceof Error ? error.message : CONTACT_PROFILE_ERROR_MESSAGES.UPDATE_FAILED

      set(state => {
        state.contactProfileErrors.update = errorMessage
      })

      toast.error(errorMessage)
      throw error
    } finally {
      set(state => {
        state.contactProfileLoading.updating = false
      })
    }
  },

  /**
   * Set the current edit mode
   * @param mode - The edit mode to set (details, experience, or null)
   */
  contactProfileSetEditMode: (mode: TEditMode) => {
    set(state => {
      state.contactProfileEditMode = mode
    })
    logger.log(`Edit mode set to: ${mode}`)
  },

  /**
   * Set contact details (for form updates)
   * @param details - Partial contact details to update
   */
  contactProfileSetContactDetails: (details: Partial<IContactDetails>) => {
    set(state => {
      Object.assign(state.contactProfileContactDetails, details)
    })
  },

  /**
   * Get the primary email from contact details
   * @returns The primary email or fallback
   */
  contactProfileGetPrimaryEmail: () => {
    const state = get()
    return getPrimaryEmail(state.contactProfileContactDetails.emails, state.contactProfileContact?.email)
  },

  /**
   * Get the primary phone from contact details
   * @returns The primary phone or fallback
   */
  contactProfileGetPrimaryPhone: () => {
    const state = get()
    return getPrimaryPhone(state.contactProfileContactDetails.phones, state.contactProfileContact?.phone)
  },

  /**
   * Get the primary address from contact details
   * @returns The primary address
   */
  contactProfileGetPrimaryAddress: () => {
    const state = get()
    return getPrimaryAddress(state.contactProfileContactDetails.addresses)
  },

  /**
   * Set activity filters for timeline
   * @param filters - Partial activity filters to apply
   */
  contactProfileSetActivityFilters: (filters: Partial<IActivityFilters>) => {
    set(state => {
      Object.assign(state.contactProfileActivityFilters, filters)
    })
    logger.log('Activity filters updated:', filters)
  },

  /**
   * Set timeline options
   * @param options - Partial timeline options to apply
   */
  contactProfileSetTimelineOptions: (options: Partial<ITimelineOptions>) => {
    set(state => {
      Object.assign(state.contactProfileTimelineOptions, options)
    })
    logger.log('Timeline options updated:', options)
  },

  /**
   * Clear a specific error from the error state
   * @param operation - The operation error to clear
   */
  contactProfileClearError: (operation: keyof IContactProfileErrorState) => {
    set(state => {
      state.contactProfileErrors[operation] = null
    })
  },

  /**
   * Clear all errors from the error state
   * Resets all operation errors to null
   */
  contactProfileClearAllErrors: () => {
    set(state => {
      state.contactProfileErrors = {
        fetch: null,
        update: null,
        fetchActivities: null,
        fetchEmails: null,
      }
    })
  },

  /**
   * Update the retry configuration for failed operations
   * @param config - Partial retry configuration to merge with existing config
   */
  contactProfileSetRetryConfig: (config: Partial<IContactProfileRetryConfig>) => {
    set(state => {
      Object.assign(state.contactProfileRetryConfig, config)
    })
    logger.log('Retry config updated:', config)
  },
})
