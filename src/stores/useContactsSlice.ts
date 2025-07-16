/**
 * @fileoverview Contacts slice for Zustand store
 * @description This slice manages the complete contacts lifecycle including caching,
 * pagination, background loading, deletion tracking, and persistence with localStorage.
 * It provides a centralized state management solution for contacts operations.
 *
 * @author Mailvibes CRM Team
 * @version 1.0.0
 */

import { StateCreator } from 'zustand'
import { TStore } from '@/types/store/store'
import { TContactsStore } from '@/types/store/contacts'
import { LeadContact } from '@/components/stream/sample-data'
import { supabase } from '@/integrations/supabase/client'
import { logger } from '@/utils/logger'
import {
  INITIAL_CONTACTS_STATE,
  RESET_CONTACTS_STATE,
  CONTACTS_CONFIG,
  CONTACTS_ERROR_MESSAGES,
  CONTACTS_SUCCESS_MESSAGES,
} from '@/constants/store/contacts'

// Store the background loading promise outside of the store
let backgroundLoadingPromise: Promise<void> | null = null
let initializationPromise: Promise<void> | null = null

/**
 * Contacts slice for Zustand store
 *
 * Manages the complete contacts lifecycle including:
 * - Contact data caching and pagination
 * - Background loading with performance optimization
 * - Deleted contacts tracking with localStorage persistence
 * - Error handling and retry logic
 * - Integration with Supabase backend
 * - Memory management and cleanup
 *
 * @example
 * ```typescript
 * // Usage in component
 * const {
 *   contactsCache,
 *   contactsOrderedIds,
 *   contactsInitialize,
 *   contactsRemoveContacts
 * } = useStore();
 *
 * // Initialize contacts for user
 * await contactsInitialize(userId);
 * ```
 */
export const useContactsSlice: StateCreator<
  TStore,
  [['zustand/subscribeWithSelector', never], ['zustand/immer', never]],
  [],
  TContactsStore
> = (set, get) => ({
  // Estado inicial con constantes
  ...INITIAL_CONTACTS_STATE,

  /**
   * Inicializa el store de contacts con el primer batch de datos
   */
  contactsInitialize: async (userId: string) => {
    // Si hay una inicialización en curso, esperar a que complete
    if (initializationPromise) {
      // Only log once, not repeatedly
      return initializationPromise
    }

    const state = get()

    // Only log initialization details in development or when there are actual issues
    if (process.env.NODE_ENV === 'development') {
      logger.log(`Initialize called for user ${userId}. Current state:`, {
        currentUserId: state.contactsInternal.userId,
        hasData: state.contactsOrderedIds.length > 0,
        loadedCount: state.contactsPagination.loadedCount,
        totalCount: state.contactsPagination.totalCount,
        hasMore: state.contactsPagination.hasMore,
        isBackgroundLoading: state.contactsInternal.backgroundLoadingActive,
        isInitialized: state.contactsPagination.isInitialized,
        firstBatchLoaded: state.contactsPagination.firstBatchLoaded,
        allContactsLoaded: state.contactsPagination.allContactsLoaded,
      })
    }

    // Si ya está inicializado para este usuario y tenemos el primer batch, solo reanudar background loading si es necesario
    if (
      state.contactsInternal.userId === userId &&
      state.contactsPagination.isInitialized &&
      state.contactsPagination.firstBatchLoaded
    ) {
      if (process.env.NODE_ENV === 'development') {
        logger.log('Store already initialized for this user with first batch loaded')
      }

      // Si no hemos cargado todos los contacts y no estamos cargando actualmente, reanudar background loading
      if (
        !state.contactsPagination.allContactsLoaded &&
        state.contactsPagination.hasMore &&
        !state.contactsInternal.backgroundLoadingActive
      ) {
        if (process.env.NODE_ENV === 'development') {
          logger.log('Resuming background loading for remaining contacts...')
        }
        get().contactsStartBackgroundLoading()
      }
      return
    }

    // Si cambiamos de usuario, limpiar todo
    if (state.contactsInternal.userId && state.contactsInternal.userId !== userId) {
      logger.log(`Switching users from ${state.contactsInternal.userId} to ${userId}, clearing store`)
      get().contactsClear()
    }

    logger.log(`Starting fresh initialization for user ${userId}`)

    // Crear y trackear la promesa de inicialización
    initializationPromise = (async () => {
      set(state => {
        state.contactsInternal.userId = userId
        state.contactsLoading.initializing = true
      })

      // Iniciar timing del load inicial
      const initStartTime = performance.now()
      logger.log(`[PERF] Starting initial load of first ${CONTACTS_CONFIG.FIRST_BATCH_SIZE} contacts...`)

      try {
        // Obtener count total primero
        const countStartTime = performance.now()
        const { count } = await supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)

        const countEndTime = performance.now()
        logger.log(`[PERF] Count query completed in ${(countEndTime - countStartTime).toFixed(2)}ms`)
        logger.log(`Total contacts in database: ${count || 0}`)

        set(state => {
          state.contactsPagination.totalCount = count || 0
        })

        // Obtener primer batch
        const fetchStartTime = performance.now()
        const { data, error } = await supabase
          .from('contacts')
          .select('id, name, email, phone, company, status, data')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(0, CONTACTS_CONFIG.FIRST_BATCH_SIZE - 1)

        const fetchEndTime = performance.now()
        logger.log(`[PERF] First batch query completed in ${(fetchEndTime - fetchStartTime).toFixed(2)}ms`)

        if (error) throw error

        if (data && data.length > 0) {
          const processStartTime = performance.now()
          const cache: Record<string, LeadContact> = {}
          const orderedIds: string[] = []
          const currentDeletedIds = get().contactsDeletedIds

          logger.log(
            `[Initialize] Processing ${data.length} contacts with ${currentDeletedIds.size} deleted IDs to filter`,
          )

          let skippedCount = 0

          // Procesar contacts
          data.forEach(contact => {
            // Saltar si este contact ha sido eliminado
            if (currentDeletedIds.has(contact.id)) {
              logger.log(`[Initialize] Skipping deleted contact: ${contact.id}`)
              skippedCount++
              return
            }

            const leadContact: LeadContact = {
              id: contact.id,
              name: contact.name || '',
              email: contact.email || '',
              phone: contact.phone || '',
              company: contact.company || '',
              status: contact.status || '',
              importListName: (contact.data as any)?.importListName || '',
              importOrder: (contact.data as any)?.importOrder,
              ...((contact.data as any) || {}),
            }

            cache[contact.id] = leadContact
            orderedIds.push(contact.id)
          })

          const processEndTime = performance.now()
          logger.log(`[PERF] Contact processing completed in ${(processEndTime - processStartTime).toFixed(2)}ms`)
          logger.log(`[Initialize] Loaded ${orderedIds.length} contacts, skipped ${skippedCount} deleted contacts`)

          const hasMoreContacts = (count || 0) > CONTACTS_CONFIG.FIRST_BATCH_SIZE
          const allLoaded = !hasMoreContacts

          set(state => {
            state.contactsCache = cache
            state.contactsOrderedIds = orderedIds
            state.contactsPagination.loadedCount = orderedIds.length
            state.contactsPagination.offset = CONTACTS_CONFIG.FIRST_BATCH_SIZE
            state.contactsPagination.hasMore = hasMoreContacts
            state.contactsLoading.initializing = false
            state.contactsPagination.isInitialized = true
            state.contactsPagination.firstBatchLoaded = true
            state.contactsPagination.allContactsLoaded = allLoaded
          })

          const totalInitTime = performance.now() - initStartTime
          logger.log(`[PERF] ✅ Initial load completed in ${totalInitTime.toFixed(2)}ms`)
          if (totalInitTime > 400) {
            logger.warn(`[PERF] ⚠️ Initial load took ${totalInitTime.toFixed(2)}ms - exceeds 400ms target!`)
          } else {
            logger.log(`[PERF] 🚀 Initial load met performance target (<400ms)`)
          }

          logger.log(`Loaded first batch: ${orderedIds.length} contacts (after filtering deleted)`)
          logger.log(`Has more contacts: ${hasMoreContacts}, All loaded: ${allLoaded}`)

          // Iniciar background loading para contacts restantes si hay más
          if (hasMoreContacts) {
            logger.log('Starting background loading for remaining contacts (21 onwards)...')
            // Pequeño delay para dejar que UI renderice el primer batch
            setTimeout(() => {
              get().contactsStartBackgroundLoading()
            }, 100)
          }
        } else {
          const totalInitTime = performance.now() - initStartTime
          logger.log(`[PERF] No contacts found. Total time: ${totalInitTime.toFixed(2)}ms`)

          set(state => {
            state.contactsLoading.initializing = false
            state.contactsPagination.hasMore = false
            state.contactsPagination.isInitialized = true
            state.contactsPagination.firstBatchLoaded = true
            state.contactsPagination.allContactsLoaded = true
          })
        }
      } catch (error) {
        const totalInitTime = performance.now() - initStartTime
        logger.error(`[PERF] Failed to initialize (${totalInitTime.toFixed(2)}ms):`, error)
        logger.error('Failed to initialize contacts store:', error)

        set(state => {
          state.contactsLoading.initializing = false
          state.contactsPagination.hasMore = false
          state.contactsPagination.isInitialized = true
          state.contactsErrors.initialize = CONTACTS_ERROR_MESSAGES.INITIALIZE_FAILED
        })
      }
    })()

    // Esperar a que complete la inicialización y luego limpiar la promesa
    try {
      await initializationPromise
    } finally {
      initializationPromise = null
    }
  },

  /**
   * Obtiene el siguiente chunk de contacts
   */
  contactsFetchNext: async () => {
    const state = get()

    // Verificar si está pausado u otras condiciones que deberían detener la carga
    if (
      state.contactsInternal.backgroundLoadingPaused ||
      state.contactsLoading.fetching ||
      !state.contactsPagination.hasMore ||
      !state.contactsInternal.userId ||
      state.contactsPagination.allContactsLoaded
    ) {
      return
    }

    set(state => {
      state.contactsLoading.fetching = true
    })

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, email, phone, company, status, data')
        .eq('user_id', state.contactsInternal.userId)
        .order('created_at', { ascending: false })
        .range(state.contactsPagination.offset, state.contactsPagination.offset + state.contactsInternal.chunkSize - 1)

      if (error) throw error

      if (data && data.length > 0) {
        // IMPORTANTE: Obtener el estado más reciente para asegurar que tenemos los IDs eliminados más recientes
        const latestState = get()
        const newCache = { ...latestState.contactsCache }
        const newOrderedIds = [...latestState.contactsOrderedIds]
        const currentDeletedIds = latestState.contactsDeletedIds

        logger.log(
          `[Background Load] Processing ${data.length} contacts, ${currentDeletedIds.size} deleted IDs tracked`,
        )

        let addedCount = 0
        let skippedCount = 0

        // Procesar nuevos contacts
        data.forEach(contact => {
          // Saltar si este contact ha sido eliminado
          if (currentDeletedIds.has(contact.id)) {
            logger.log(`[Background Load] Skipping deleted contact: ${contact.id}`)
            skippedCount++
            return
          }

          const leadContact: LeadContact = {
            id: contact.id,
            name: contact.name || '',
            email: contact.email || '',
            phone: contact.phone || '',
            company: contact.company || '',
            status: contact.status || '',
            importListName: (contact.data as any)?.importListName || '',
            importOrder: (contact.data as any)?.importOrder,
            ...((contact.data as any) || {}),
          }

          // Solo agregar si no está ya en cache
          if (!newCache[contact.id]) {
            newCache[contact.id] = leadContact
            newOrderedIds.push(contact.id)
            addedCount++
          }
        })

        const newLoadedCount = latestState.contactsPagination.loadedCount + addedCount
        const hasMore =
          data.length === state.contactsInternal.chunkSize && newLoadedCount < latestState.contactsPagination.totalCount

        set(state => {
          state.contactsCache = newCache
          state.contactsOrderedIds = newOrderedIds
          state.contactsPagination.loadedCount = newLoadedCount
          state.contactsPagination.offset = state.contactsPagination.offset + state.contactsInternal.chunkSize
          state.contactsPagination.hasMore = hasMore
          state.contactsLoading.fetching = false
          state.contactsPagination.allContactsLoaded = !hasMore
        })

        logger.log(
          `[Background Load] Loaded chunk: ${addedCount} new contacts, ${skippedCount} skipped (total: ${newLoadedCount}/${latestState.contactsPagination.totalCount})`,
        )
      } else {
        set(state => {
          state.contactsPagination.hasMore = false
          state.contactsLoading.fetching = false
          state.contactsPagination.allContactsLoaded = true
        })
        logger.log('No more contacts to load')
      }
    } catch (error) {
      logger.error('Failed to fetch next chunk:', error)

      // Si es un error de timeout, ajustar estrategia
      if (error.code === '57014' || error.message?.includes('timeout')) {
        logger.log('Database timeout detected, adjusting strategy')

        // Solo reducir chunk size si es aún grande
        const currentChunkSize = state.contactsInternal.chunkSize
        if (currentChunkSize > 500) {
          const newChunkSize = Math.max(500, Math.floor(currentChunkSize * 0.75)) // Reducir 25%, mínimo 500
          set(state => {
            state.contactsInternal.chunkSize = newChunkSize
            state.contactsLoading.fetching = false
          })
          logger.log(`Reduced chunk size from ${currentChunkSize} to ${newChunkSize}`)
        } else {
          // Si chunk size ya es pequeño, solo pausar brevemente
          set(state => {
            state.contactsLoading.fetching = false
          })
        }

        // Agregar un pequeño delay antes del siguiente intento
        await new Promise(resolve => setTimeout(resolve, 2000)) // 2 segundos de delay
      } else {
        set(state => {
          state.contactsLoading.fetching = false
          state.contactsErrors.fetch = CONTACTS_ERROR_MESSAGES.FETCH_FAILED
        })
      }
    }
  },

  /**
   * Inicia el proceso de background loading
   */
  contactsStartBackgroundLoading: async () => {
    const state = get()

    // No iniciar si ya se cargaron todos los contacts
    if (state.contactsPagination.allContactsLoaded) {
      logger.log('All contacts already loaded, skipping background loading')
      return
    }

    // Si está pausado, background loading está deshabilitado, o ya está cargando, regresar
    if (
      state.contactsInternal.backgroundLoadingPaused ||
      state.contactsInternal.backgroundLoadingActive ||
      !state.contactsPagination.hasMore ||
      !state.contactsInternal.userId
    ) {
      return backgroundLoadingPromise || Promise.resolve()
    }

    // Si ya tenemos una promesa de background loading, regresarla
    if (backgroundLoadingPromise) {
      return backgroundLoadingPromise
    }

    set(state => {
      state.contactsInternal.backgroundLoadingActive = true
      state.contactsLoading.backgroundLoading = true
    })

    // Crear la promesa de background loading
    backgroundLoadingPromise = (async () => {
      try {
        logger.log('Starting background loading of remaining contacts...')

        // Seguir cargando mientras haya más datos y no esté pausado
        while (
          get().contactsPagination.hasMore &&
          get().contactsInternal.userId === state.contactsInternal.userId &&
          !get().contactsInternal.backgroundLoadingPaused &&
          !get().contactsPagination.allContactsLoaded
        ) {
          await get().contactsFetchNext()

          // Pequeño delay entre chunks para mantener UI responsive
          await new Promise(resolve => setTimeout(resolve, CONTACTS_CONFIG.BACKGROUND_LOADING_DELAY))
        }

        const finalState = get()
        if (!finalState.contactsPagination.hasMore) {
          set(state => {
            state.contactsPagination.allContactsLoaded = true
          })
          logger.log(`Background loading complete! All ${finalState.contactsPagination.loadedCount} contacts loaded.`)
        } else {
          logger.log('Background loading paused or stopped')
        }
      } catch (error) {
        logger.error('Background loading error:', error)
        set(state => {
          state.contactsErrors.fetch = CONTACTS_ERROR_MESSAGES.BACKGROUND_LOADING_FAILED
        })
      } finally {
        set(state => {
          state.contactsInternal.backgroundLoadingActive = false
          state.contactsLoading.backgroundLoading = false
        })
        backgroundLoadingPromise = null
      }
    })()

    return backgroundLoadingPromise
  },

  /**
   * Pausa el background loading
   */
  contactsPauseBackgroundLoading: () => {
    logger.log('[ContactsStore] Pausing background loading')
    set(state => {
      state.contactsInternal.backgroundLoadingPaused = true
    })
  },

  /**
   * Reanuda el background loading
   */
  contactsResumeBackgroundLoading: () => {
    const state = get()
    logger.log('[ContactsStore] Resuming background loading')

    set(state => {
      state.contactsInternal.backgroundLoadingPaused = false
    })

    // Si tenemos más para cargar y no estamos cargando actualmente, reiniciar background loading
    if (
      state.contactsPagination.hasMore &&
      !state.contactsInternal.backgroundLoadingActive &&
      state.contactsInternal.userId &&
      !state.contactsPagination.allContactsLoaded
    ) {
      get().contactsStartBackgroundLoading()
    }
  },

  /**
   * Limpia el cache - solo llamado en logout
   */
  contactsClear: () => {
    logger.log('[ContactsStore] Clear called - resetting entire store for logout')

    // Cancelar cualquier background loading en curso
    backgroundLoadingPromise = null
    initializationPromise = null

    // Limpiar todos los datos y resetear al estado inicial
    set(state => {
      Object.assign(state, {
        ...RESET_CONTACTS_STATE,
        // Mantener contactsDeletedIds incluso después del logout
        contactsDeletedIds: state.contactsDeletedIds,
      })
    })
  },

  /**
   * Force refresh - limpiar cache pero mantener usuario y IDs eliminados, luego reinicializar
   */
  contactsForceRefresh: async () => {
    const state = get()
    const userId = state.contactsInternal.userId
    const deletedIds = state.contactsDeletedIds

    if (!userId) return

    logger.log('[ContactsStore] Force refresh - clearing cache and reinitializing')

    // Cancelar cualquier background loading en curso
    backgroundLoadingPromise = null
    initializationPromise = null

    // Limpiar cache pero mantener usuario y IDs eliminados
    set(state => {
      Object.assign(state, {
        ...RESET_CONTACTS_STATE,
        contactsInternal: {
          ...RESET_CONTACTS_STATE.contactsInternal,
          userId: userId,
        },
        contactsDeletedIds: deletedIds,
      })
    })

    // Reinicializar con el mismo usuario
    await get().contactsInitialize(userId)
  },

  /**
   * Remueve contacts del cache
   */
  contactsRemoveContacts: (contactIds: string[]) => {
    const state = get()
    const contactIdSet = new Set(contactIds)

    logger.log(`[removeContacts] Removing ${contactIds.length} contacts from store`)
    logger.log(`[removeContacts] Contact IDs to remove:`, contactIds)

    set(state => {
      // Crear nuevo cache sin contacts eliminados
      const newCache = { ...state.contactsCache }
      contactIds.forEach(id => {
        delete newCache[id]
      })

      // Filtrar contacts eliminados de orderedIds
      const newOrderedIds = state.contactsOrderedIds.filter(id => !contactIdSet.has(id))

      // Actualizar counts
      const deletedCount = state.contactsOrderedIds.length - newOrderedIds.length
      const newLoadedCount = Math.max(0, state.contactsPagination.loadedCount - deletedCount)
      const newTotalCount = Math.max(0, state.contactsPagination.totalCount - deletedCount)

      // Agregar IDs eliminados al set de tracking
      const newDeletedIds = new Set(state.contactsDeletedIds)
      contactIds.forEach(id => newDeletedIds.add(id))

      state.contactsCache = newCache
      state.contactsOrderedIds = newOrderedIds
      state.contactsPagination.loadedCount = newLoadedCount
      state.contactsPagination.totalCount = newTotalCount
      state.contactsDeletedIds = newDeletedIds
    })

    logger.log(`[removeContacts] Successfully removed ${contactIds.length} contacts from store`)
  },

  /**
   * Restaura contacts al cache (usado cuando falla la operación de DB)
   */
  contactsRestoreContacts: (contacts: LeadContact[]) => {
    set(state => {
      const newCache = { ...state.contactsCache }
      const newOrderedIds = [...state.contactsOrderedIds]
      const newDeletedIds = new Set(state.contactsDeletedIds)

      contacts.forEach(contact => {
        // Agregar contact de vuelta al cache
        newCache[contact.id] = contact

        // Agregar de vuelta a ordered IDs si no está ya presente
        if (!newOrderedIds.includes(contact.id)) {
          newOrderedIds.unshift(contact.id) // Agregar al principio
        }

        // Remover del set de tracking de eliminados
        newDeletedIds.delete(contact.id)
      })

      state.contactsCache = newCache
      state.contactsOrderedIds = newOrderedIds
      state.contactsPagination.loadedCount = state.contactsPagination.loadedCount + contacts.length
      state.contactsPagination.totalCount = state.contactsPagination.totalCount + contacts.length
      state.contactsDeletedIds = newDeletedIds
    })

    logger.log(`Restored ${contacts.length} contacts to store`)
  },

  /**
   * Agrega un nuevo contact al cache
   */
  contactsAddContact: (contact: LeadContact) => {
    const state = get()

    // Saltar si este contact ID está en el set de eliminados
    if (state.contactsDeletedIds.has(contact.id)) {
      logger.warn(`[addContact] Contact ${contact.id} is in deleted set, not adding`)
      return
    }

    // Saltar si este contact ya está en el cache
    if (state.contactsCache[contact.id]) {
      logger.warn(`[addContact] Contact ${contact.id} already exists in cache, not adding duplicate`)
      return
    }

    logger.log(`[addContact] Adding new contact: ${contact.name} (${contact.id})`)

    set(state => {
      // Crear nuevo cache y ordered IDs con el nuevo contact al principio
      const newCache = { ...state.contactsCache, [contact.id]: contact }
      const newOrderedIds = [contact.id, ...state.contactsOrderedIds]

      state.contactsCache = newCache
      state.contactsOrderedIds = newOrderedIds
      state.contactsPagination.loadedCount = state.contactsPagination.loadedCount + 1
      state.contactsPagination.totalCount = state.contactsPagination.totalCount + 1
    })

    logger.log(
      `[addContact] Successfully added contact to store. New count: ${state.contactsPagination.loadedCount + 1}`,
    )
  },

  /**
   * Actualiza un contact individual en el cache
   */
  contactsUpdateContact: (contactId: string, updates: Partial<LeadContact>) => {
    const state = get()

    // Saltar si este contact ID está en el set de eliminados
    if (state.contactsDeletedIds.has(contactId)) {
      logger.warn(`[updateContact] Contact ${contactId} is in deleted set, not updating`)
      return
    }

    // Saltar si este contact no está en el cache
    if (!state.contactsCache[contactId]) {
      logger.warn(`[updateContact] Contact ${contactId} not found in cache, cannot update`)
      return
    }

    logger.log(`[updateContact] Updating contact: ${contactId}`, updates)

    set(state => {
      // Crear nuevo cache con el contact actualizado
      const newCache = {
        ...state.contactsCache,
        [contactId]: {
          ...state.contactsCache[contactId],
          ...updates,
        },
      }

      state.contactsCache = newCache
    })

    logger.log(`[updateContact] Successfully updated contact in store`)
  },
})
