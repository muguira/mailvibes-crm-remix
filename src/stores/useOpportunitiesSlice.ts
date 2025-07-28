/**
 * @fileoverview Opportunities slice for Zustand store
 * @description This slice manages the complete opportunities lifecycle including caching,
 * pagination, background loading, deletion tracking, and persistence with localStorage.
 * It provides a centralized state management solution for opportunities operations.
 *
 * @author SalesSheet CRM Team
 * @version 1.0.0
 */

import {
  INITIAL_OPPORTUNITIES_STATE,
  OPPORTUNITIES_CONFIG,
  OPPORTUNITIES_ERROR_MESSAGES,
  RESET_OPPORTUNITIES_STATE,
} from '@/constants/store/opportunities'
import { supabase } from '@/integrations/supabase/client'
import { TOpportunitiesStore } from '@/types/store/opportunities'
import { TStore } from '@/types/store/store'
import { logger } from '@/utils/logger'
import { StateCreator } from 'zustand'

// Store the background loading promise outside of the store
let backgroundLoadingPromise: Promise<void> | null = null
let initializationPromise: Promise<void> | null = null

// Type for opportunity object (matching database schema)
export interface Opportunity {
  id: string
  opportunity: string
  status: string
  stage: string
  revenue: number
  closeDate: string
  owner: string
  company: string
  priority: string
  originalContactId: string | null
  createdAt: string
  updatedAt: string
  [key: string]: any // For additional dynamic properties
}

/**
 * Opportunities slice for Zustand store
 *
 * Manages the complete opportunities lifecycle including:
 * - Opportunity data caching and pagination
 * - Background loading with performance optimization
 * - Deleted opportunities tracking with localStorage persistence
 * - Error handling and retry logic
 * - Integration with Supabase backend
 * - Memory management and cleanup
 *
 * @example
 * ```typescript
 * // Usage in component
 * const {
 *   opportunitiesCache,
 *   opportunitiesOrderedIds,
 *   opportunitiesInitialize,
 *   opportunitiesRemoveOpportunities
 * } = useStore();
 *
 * // Initialize opportunities for user
 * await opportunitiesInitialize(userId);
 * ```
 */
export const useOpportunitiesSlice: StateCreator<
  TStore,
  [['zustand/subscribeWithSelector', never], ['zustand/immer', never]],
  [],
  TOpportunitiesStore
> = (set, get) => ({
  // Estado inicial con constantes
  ...INITIAL_OPPORTUNITIES_STATE,

  /**
   * Inicializa el store de opportunities con el primer batch de datos
   */
  // 🚀 OPTIMIZED: Initialize opportunities with enhanced pagination and caching
  opportunitiesInitialize: async (userId: string) => {
    console.log('🔥 [INIT] opportunitiesInitialize called with userId:', userId)

    // Si hay una inicialización en curso, esperar a que complete
    if (initializationPromise) {
      logger.log('Initialization already in progress, waiting for completion...')
      return initializationPromise
    }

    const state = get()
    const hasRealData = state.opportunitiesOrderedIds.length > 0
    const isAlreadyInitialized =
      state.opportunitiesPagination.isInitialized && state.opportunitiesPagination.firstBatchLoaded
    const isCurrentUser = state.opportunitiesInternal.userId === userId
    const isCurrentlyLoading = state.opportunitiesLoading.initializing || state.opportunitiesLoading.fetching

    // 🚀 STRICT CHECK: Return early if already properly initialized for this user
    if (isCurrentUser && isAlreadyInitialized && hasRealData) {
      logger.log(
        `✅ [SKIP] Opportunities store already initialized with ${state.opportunitiesOrderedIds.length} opportunities`,
      )

      // Si no hemos cargado todas las opportunities y no estamos cargando actualmente, reanudar background loading
      if (
        !state.opportunitiesPagination.allOpportunitiesLoaded &&
        state.opportunitiesPagination.hasMore &&
        !state.opportunitiesInternal.backgroundLoadingActive
      ) {
        if (process.env.NODE_ENV === 'development') {
          logger.log('Resuming background loading for remaining opportunities...')
        }
        get().opportunitiesStartBackgroundLoading()
      }
      return
    }

    // 🚀 LOADING CHECK: Prevent multiple concurrent initializations
    if (isCurrentlyLoading) {
      logger.log('⏸️ [SKIP] Already loading opportunities, waiting for completion...')
      return initializationPromise
    }

    // 🚀 ENHANCED: Better diagnostic logging for why initialization is needed
    logger.log(`🔄 [INIT] Fresh initialization required. Reasons:`, {
      userChange: !isCurrentUser ? `${state.opportunitiesInternal.userId} → ${userId}` : false,
      notInitialized: !isAlreadyInitialized,
      noData: !hasRealData,
      dataStats: {
        orderedIds: state.opportunitiesOrderedIds.length,
        cacheSize: Object.keys(state.opportunitiesCache).length,
        totalCount: state.opportunitiesPagination.totalCount,
        loadedCount: state.opportunitiesPagination.loadedCount,
      },
      flags: {
        isInitialized: state.opportunitiesPagination.isInitialized,
        firstBatchLoaded: state.opportunitiesPagination.firstBatchLoaded,
        allLoaded: state.opportunitiesPagination.allOpportunitiesLoaded,
      },
    })

    // Si cambiamos de usuario, limpiar todo
    if (state.opportunitiesInternal.userId && state.opportunitiesInternal.userId !== userId) {
      logger.log(
        `Switching users from ${state.opportunitiesInternal.userId} to ${userId}, clearing opportunities store`,
      )
      get().opportunitiesClear()
    }

    logger.log(`Starting fresh opportunities initialization for user ${userId}`)
    console.log('🚀 [INIT] About to create initialization promise for user:', userId)

    // Crear y trackear la promesa de inicialización
    initializationPromise = (async () => {
      set(state => {
        state.opportunitiesInternal.userId = userId
        state.opportunitiesLoading.initializing = true
      })

      logger.log(`🚀 [INIT] Starting opportunities initialization for user: ${userId}`)
      console.log('🚀 [INIT] Inside promise - about to start Supabase query')

      // Iniciar timing del load inicial
      const initStartTime = performance.now()
      logger.log(`[PERF] Starting initial load of first ${OPPORTUNITIES_CONFIG.FIRST_BATCH_SIZE} opportunities...`)

      try {
        // Obtener count total primero
        const countStartTime = performance.now()

        const { count } = await supabase
          .from('opportunities')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)

        const countEndTime = performance.now()
        logger.log(`[PERF] Opportunities count query completed in ${(countEndTime - countStartTime).toFixed(2)}ms`)
        logger.log(`Total opportunities in database: ${count || 0}`)

        set(state => {
          state.opportunitiesPagination.totalCount = count || 0
        })

        // Obtener primer batch
        const fetchStartTime = performance.now()
        const { data, error } = await supabase
          .from('opportunities')
          .select(
            `
            id,
            opportunity,
            status,
            revenue,
            close_date,
            owner,
            company_name,
            priority,
            original_contact_id,
            created_at,
            updated_at
          `,
          )
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(0, OPPORTUNITIES_CONFIG.FIRST_BATCH_SIZE - 1)

        const fetchEndTime = performance.now()
        logger.log(
          `[PERF] First opportunities batch query completed in ${(fetchEndTime - fetchStartTime).toFixed(2)}ms`,
        )

        if (error) {
          logger.error('🚨 [INIT] Supabase query error:', error)
          throw error
        }

        logger.log(`🚀 [INIT] Supabase query returned ${data?.length || 0} opportunities`)
        console.log('🔍 [DEBUG] Raw data from Supabase (first 2):', data?.slice(0, 2))

        if (data && data.length > 0) {
          const processStartTime = performance.now()
          const cache: Record<string, Opportunity> = {}
          const orderedIds: string[] = []
          const currentDeletedIds = get().opportunitiesDeletedIds

          logger.log(
            `[Initialize] Processing ${data.length} opportunities with ${currentDeletedIds.size} deleted IDs to filter`,
          )

          let skippedCount = 0

          // Status mapping from database values to frontend values
          const statusMapping: Record<string, string> = {
            'Demo agendada': 'Lead/New',
            'Demo asistida': 'Discovery',
            'Propuesta enviada': 'Proposal',
            'Int. de cierre': 'Closing',
            'Confirmación verbal': 'Negotiation',
            Ganado: 'Won',
            Perdido: 'Lost',
            'Contract Sent': 'Proposal',
            'In Procurement': 'Discovery',
            'Deal Won': 'Won',
            Qualified: 'Qualified',
            'Lead/New': 'Lead/New',
            Discovery: 'Discovery',
            Proposal: 'Proposal',
            Negotiation: 'Negotiation',
            Closing: 'Closing',
            Won: 'Won',
            Lost: 'Lost',
          }

          // Procesar opportunities
          data.forEach(opp => {
            // Saltar si este opportunity ha sido eliminado
            if (currentDeletedIds.has(opp.id)) {
              logger.log(`[Initialize] Skipping deleted opportunity: ${opp.id}`)
              skippedCount++
              return
            }

            const opportunity: Opportunity = {
              id: opp.id,
              opportunity: opp.opportunity || '',
              status: opp.status || 'Lead/New',
              stage: statusMapping[opp.status] || opp.status || 'Lead/New',
              revenue: parseInt(opp.revenue?.toString() || '0'),
              closeDate: opp.close_date || '',
              owner: opp.owner || '',
              company: opp.company_name || '',
              companyName: opp.company_name || '', // ← ADDED: Map to companyName as well
              priority: opp.priority || 'Medium',
              originalContactId: opp.original_contact_id,
              createdAt: opp.created_at,
              updatedAt: opp.updated_at,
            }

            cache[opp.id] = opportunity
            orderedIds.push(opp.id)

            // Debug logging for first opportunity to verify mapping
            if (orderedIds.length === 1) {
              console.log('🔍 [DEBUG] First opportunity mapped:', {
                id: opportunity.id,
                company: opportunity.company,
                companyName: opportunity.companyName,
                rawCompanyName: opp.company_name,
              })
            }
          })

          const processEndTime = performance.now()
          logger.log(`[PERF] Opportunity processing completed in ${(processEndTime - processStartTime).toFixed(2)}ms`)

          if (skippedCount > 0) {
            logger.log(`[Initialize] Skipped ${skippedCount} deleted opportunities`)
          }

          // Actualizar el store con el cache de opportunities
          set(state => {
            state.opportunitiesCache = cache
            state.opportunitiesOrderedIds = orderedIds
            state.opportunitiesPagination.loadedCount = orderedIds.length
            state.opportunitiesPagination.offset = orderedIds.length
            state.opportunitiesPagination.hasMore =
              orderedIds.length < (count || 0) && orderedIds.length === OPPORTUNITIES_CONFIG.FIRST_BATCH_SIZE
            state.opportunitiesPagination.firstBatchLoaded = true
            state.opportunitiesPagination.isInitialized = true

            // 🚀 FIX: Clear loading state immediately upon successful completion
            state.opportunitiesLoading.initializing = false

            // Si no hay más datos que cargar, marcar como completo
            if (!state.opportunitiesPagination.hasMore) {
              state.opportunitiesPagination.allOpportunitiesLoaded = true
            }
          })

          logger.log(`🚀 [INIT] Store updated successfully:`, {
            cacheSize: Object.keys(cache).length,
            orderedIdsLength: orderedIds.length,
            sampleOpportunity: orderedIds.length > 0 ? cache[orderedIds[0]] : null,
            hasMore: get().opportunitiesPagination.hasMore,
            isInitialized: get().opportunitiesPagination.isInitialized,
          })

          const initEndTime = performance.now()
          logger.log(
            `[PERF] Total opportunities initialization completed in ${(initEndTime - initStartTime).toFixed(2)}ms`,
          )
          logger.log(
            `[Initialize] Loaded ${orderedIds.length} opportunities. Has more: ${get().opportunitiesPagination.hasMore}`,
          )

          // Iniciar background loading para el resto de opportunities si hay más datos
          if (get().opportunitiesPagination.hasMore) {
            logger.log('[Initialize] Starting background loading for remaining opportunities')
            get().opportunitiesStartBackgroundLoading()
          }
        } else {
          // No hay datos
          set(state => {
            state.opportunitiesPagination.firstBatchLoaded = true
            state.opportunitiesPagination.isInitialized = true
            state.opportunitiesPagination.allOpportunitiesLoaded = true
            state.opportunitiesPagination.hasMore = false

            // 🚀 FIX: Clear loading state when no data found
            state.opportunitiesLoading.initializing = false
          })

          logger.log('[Initialize] No opportunities found for user')
        }
      } catch (error) {
        logger.error('[Initialize] Error during opportunities initialization:', error)
        set(state => {
          state.opportunitiesErrors.initialize =
            error instanceof Error ? error.message : OPPORTUNITIES_ERROR_MESSAGES.INITIALIZE_FAILED
        })
        throw error
      } finally {
        // 🚀 SAFETY: Only clear loading if not already cleared in success case
        set(state => {
          if (state.opportunitiesLoading.initializing) {
            state.opportunitiesLoading.initializing = false
          }
        })
        initializationPromise = null
      }
    })()

    return initializationPromise
  },

  /**
   * Obtiene el siguiente chunk de opportunities
   */
  opportunitiesFetchNext: async () => {
    const state = get()

    if (!state.opportunitiesInternal.userId) {
      throw new Error(OPPORTUNITIES_ERROR_MESSAGES.INVALID_USER)
    }

    if (!state.opportunitiesPagination.hasMore || state.opportunitiesLoading.fetching) {
      return
    }

    set(state => {
      state.opportunitiesLoading.fetching = true
    })

    try {
      const { data, error } = await supabase
        .from('opportunities')
        .select(
          `
          id,
          opportunity,
          status,
          revenue,
          close_date,
          owner,
          company_name,
          priority,
          original_contact_id,
          created_at,
          updated_at
        `,
        )
        .eq('user_id', get().opportunitiesInternal.userId)
        .order('created_at', { ascending: false })
        .range(
          state.opportunitiesPagination.offset,
          state.opportunitiesPagination.offset + state.opportunitiesInternal.chunkSize - 1,
        )

      if (error) throw error

      if (data && data.length > 0) {
        const cache: Record<string, Opportunity> = { ...state.opportunitiesCache }
        const orderedIds: string[] = [...state.opportunitiesOrderedIds]
        const currentDeletedIds = state.opportunitiesDeletedIds

        // Status mapping
        const statusMapping: Record<string, string> = {
          'Demo agendada': 'Lead/New',
          'Demo asistida': 'Discovery',
          'Propuesta enviada': 'Proposal',
          'Int. de cierre': 'Closing',
          'Confirmación verbal': 'Negotiation',
          Ganado: 'Won',
          Perdido: 'Lost',
          'Contract Sent': 'Proposal',
          'In Procurement': 'Discovery',
          'Deal Won': 'Won',
          Qualified: 'Qualified',
          'Lead/New': 'Lead/New',
          Discovery: 'Discovery',
          Proposal: 'Proposal',
          Negotiation: 'Negotiation',
          Closing: 'Closing',
          Won: 'Won',
          Lost: 'Lost',
        }

        data.forEach(opp => {
          // Saltar si este opportunity ha sido eliminado
          if (currentDeletedIds.has(opp.id)) {
            return
          }

          const opportunity: Opportunity = {
            id: opp.id,
            opportunity: opp.opportunity || '',
            status: opp.status || 'Lead/New',
            stage: statusMapping[opp.status] || opp.status || 'Lead/New',
            revenue: parseInt(opp.revenue?.toString() || '0'),
            closeDate: opp.close_date || '',
            owner: opp.owner || '',
            company: opp.company_name || '',
            priority: opp.priority || 'Medium',
            originalContactId: opp.original_contact_id,
            createdAt: opp.created_at,
            updatedAt: opp.updated_at,
          }

          cache[opp.id] = opportunity
          orderedIds.push(opp.id)
        })

        set(state => {
          state.opportunitiesCache = cache
          state.opportunitiesOrderedIds = orderedIds
          state.opportunitiesPagination.loadedCount = orderedIds.length
          state.opportunitiesPagination.offset = orderedIds.length
          state.opportunitiesPagination.hasMore = data.length === state.opportunitiesInternal.chunkSize
        })

        logger.log(`[FetchNext] Loaded ${data.length} more opportunities. Total: ${orderedIds.length}`)
      } else {
        set(state => {
          state.opportunitiesPagination.hasMore = false
          state.opportunitiesPagination.allOpportunitiesLoaded = true
        })
        logger.log('[FetchNext] No more opportunities to load')
      }
    } catch (error) {
      logger.error('[FetchNext] Error fetching opportunities:', error)
      set(state => {
        state.opportunitiesErrors.fetch =
          error instanceof Error ? error.message : OPPORTUNITIES_ERROR_MESSAGES.FETCH_FAILED
      })
      throw error
    } finally {
      set(state => {
        state.opportunitiesLoading.fetching = false
      })
    }
  },

  /**
   * Inicia la carga en background de opportunities restantes
   */
  opportunitiesStartBackgroundLoading: async () => {
    const state = get()

    if (state.opportunitiesInternal.backgroundLoadingActive || !state.opportunitiesPagination.hasMore) {
      return
    }

    if (backgroundLoadingPromise) {
      return backgroundLoadingPromise
    }

    logger.log('[BackgroundLoading] Starting background loading of opportunities')

    set(state => {
      state.opportunitiesInternal.backgroundLoadingActive = true
      state.opportunitiesLoading.backgroundLoading = true
    })

    backgroundLoadingPromise = (async () => {
      try {
        while (get().opportunitiesPagination.hasMore && !get().opportunitiesInternal.backgroundLoadingPaused) {
          await get().opportunitiesFetchNext()

          // Small delay to keep UI responsive
          if (get().opportunitiesPagination.hasMore) {
            await new Promise(resolve => setTimeout(resolve, OPPORTUNITIES_CONFIG.BACKGROUND_LOADING_DELAY))
          }
        }

        if (get().opportunitiesPagination.hasMore) {
          logger.log('[BackgroundLoading] Paused due to user interaction')
        } else {
          logger.log('[BackgroundLoading] All opportunities loaded successfully')
          set(state => {
            state.opportunitiesPagination.allOpportunitiesLoaded = true
          })
        }
      } catch (error) {
        logger.error('[BackgroundLoading] Error during background loading:', error)
        set(state => {
          state.opportunitiesErrors.fetch =
            error instanceof Error ? error.message : OPPORTUNITIES_ERROR_MESSAGES.BACKGROUND_LOADING_FAILED
        })
      } finally {
        set(state => {
          state.opportunitiesInternal.backgroundLoadingActive = false
          state.opportunitiesLoading.backgroundLoading = false
        })
        backgroundLoadingPromise = null
      }
    })()

    return backgroundLoadingPromise
  },

  /**
   * Pausa la carga en background
   */
  opportunitiesPauseBackgroundLoading: () => {
    logger.log('[BackgroundLoading] Pausing background loading')
    set(state => {
      state.opportunitiesInternal.backgroundLoadingPaused = true
    })
  },

  /**
   * Reanuda la carga en background
   */
  opportunitiesResumeBackgroundLoading: () => {
    const state = get()

    logger.log('[BackgroundLoading] Resuming background loading')
    set(state => {
      state.opportunitiesInternal.backgroundLoadingPaused = false
    })

    if (state.opportunitiesPagination.hasMore && !state.opportunitiesInternal.backgroundLoadingActive) {
      get().opportunitiesStartBackgroundLoading()
    }
  },

  /**
   * Asegura que se hayan cargado el mínimo de opportunities requeridos
   */
  opportunitiesEnsureMinimumLoaded: async (minimumRequired: number) => {
    const state = get()

    if (
      state.opportunitiesPagination.loadedCount >= minimumRequired ||
      state.opportunitiesPagination.allOpportunitiesLoaded
    ) {
      return
    }

    logger.log(
      `[EnsureMinimum] Need to load ${minimumRequired - state.opportunitiesPagination.loadedCount} more opportunities`,
    )

    while (state.opportunitiesPagination.loadedCount < minimumRequired && state.opportunitiesPagination.hasMore) {
      await get().opportunitiesFetchNext()
    }
  },

  /**
   * Limpia todo el cache (usado en logout)
   */
  opportunitiesClear: () => {
    logger.log('[Clear] Clearing opportunities store')

    // Cancel any ongoing background loading
    backgroundLoadingPromise = null
    initializationPromise = null

    set(state => {
      Object.assign(state, RESET_OPPORTUNITIES_STATE)
    })
  },

  /**
   * Fuerza un refresh completo del cache
   */
  opportunitiesForceRefresh: async () => {
    const state = get()
    const userId = state.opportunitiesInternal.userId

    if (!userId) {
      throw new Error(OPPORTUNITIES_ERROR_MESSAGES.INVALID_USER)
    }

    logger.log('[ForceRefresh] Force refreshing opportunities cache')

    get().opportunitiesClear()
    await get().opportunitiesInitialize(userId)
  },

  /**
   * Remueve opportunities del cache y los marca como eliminados
   */
  opportunitiesRemoveOpportunities: (opportunityIds: string[]) => {
    const state = get()

    logger.log(`[RemoveOpportunities] Removing ${opportunityIds.length} opportunities from cache`)

    set(state => {
      const newCache = { ...state.opportunitiesCache }
      const newOrderedIds = [...state.opportunitiesOrderedIds]
      const newDeletedIds = new Set(state.opportunitiesDeletedIds)

      opportunityIds.forEach(id => {
        delete newCache[id]
        const index = newOrderedIds.indexOf(id)
        if (index > -1) {
          newOrderedIds.splice(index, 1)
        }
        newDeletedIds.add(id)
      })

      state.opportunitiesCache = newCache
      state.opportunitiesOrderedIds = newOrderedIds
      state.opportunitiesDeletedIds = newDeletedIds
      state.opportunitiesPagination.loadedCount = newOrderedIds.length
      state.opportunitiesPagination.totalCount = Math.max(
        0,
        state.opportunitiesPagination.totalCount - opportunityIds.length,
      )
    })
  },

  /**
   * Restaura opportunities al cache (usado cuando falla la eliminación en DB)
   */
  opportunitiesRestoreOpportunities: (opportunities: Opportunity[]) => {
    const state = get()

    logger.log(`[RestoreOpportunities] Restoring ${opportunities.length} opportunities to cache`)

    set(state => {
      const newCache = { ...state.opportunitiesCache }
      const newOrderedIds = [...state.opportunitiesOrderedIds]
      const newDeletedIds = new Set(state.opportunitiesDeletedIds)

      opportunities.forEach(opportunity => {
        newCache[opportunity.id] = opportunity
        if (!newOrderedIds.includes(opportunity.id)) {
          newOrderedIds.unshift(opportunity.id) // Add to beginning
        }
        newDeletedIds.delete(opportunity.id)
      })

      state.opportunitiesCache = newCache
      state.opportunitiesOrderedIds = newOrderedIds
      state.opportunitiesDeletedIds = newDeletedIds
      state.opportunitiesPagination.loadedCount = newOrderedIds.length
      state.opportunitiesPagination.totalCount = state.opportunitiesPagination.totalCount + opportunities.length
    })
  },

  /**
   * Agrega un nuevo opportunity al cache
   */
  opportunitiesAddOpportunity: (opportunity: Opportunity) => {
    const state = get()

    // Saltar si este opportunity ya está en el cache
    if (state.opportunitiesCache[opportunity.id]) {
      logger.warn(`[addOpportunity] Opportunity ${opportunity.id} already exists in cache, not adding duplicate`)
      return
    }

    logger.log(`[addOpportunity] Adding new opportunity: ${opportunity.opportunity} (${opportunity.id})`)

    set(state => {
      // Crear nuevo cache y ordered IDs con el nuevo opportunity al principio
      const newCache = { ...state.opportunitiesCache, [opportunity.id]: opportunity }
      const newOrderedIds = [opportunity.id, ...state.opportunitiesOrderedIds]

      state.opportunitiesCache = newCache
      state.opportunitiesOrderedIds = newOrderedIds
      state.opportunitiesPagination.loadedCount = state.opportunitiesPagination.loadedCount + 1
      state.opportunitiesPagination.totalCount = state.opportunitiesPagination.totalCount + 1
    })

    logger.log(
      `[addOpportunity] Successfully added opportunity to store. New count: ${state.opportunitiesPagination.loadedCount + 1}`,
    )
  },

  /**
   * Actualiza un opportunity individual en el cache
   */
  opportunitiesUpdateOpportunity: (opportunityId: string, updates: Partial<Opportunity>) => {
    const state = get()

    // Saltar si este opportunity ID está en el set de eliminados
    if (state.opportunitiesDeletedIds.has(opportunityId)) {
      logger.warn(`[updateOpportunity] Opportunity ${opportunityId} is in deleted set, not updating`)
      return
    }

    // Saltar si este opportunity no está en el cache
    if (!state.opportunitiesCache[opportunityId]) {
      logger.warn(`[updateOpportunity] Opportunity ${opportunityId} not found in cache, cannot update`)
      return
    }

    logger.log(`[updateOpportunity] Updating opportunity: ${opportunityId}`, updates)
    console.log('🔄 [STORE] opportunitiesUpdateOpportunity called:', {
      opportunityId,
      updates,
      existsInCache: !!state.opportunitiesCache[opportunityId],
    })

    set(state => {
      // Crear nuevo cache con el opportunity actualizado
      const newCache = {
        ...state.opportunitiesCache,
        [opportunityId]: {
          ...state.opportunitiesCache[opportunityId],
          ...updates,
        },
      }

      state.opportunitiesCache = newCache

      console.log('✅ [STORE] Store updated successfully:', {
        opportunityId,
        updatedOpportunity: newCache[opportunityId],
        cacheSize: Object.keys(newCache).length,
      })
    })

    logger.log(`[updateOpportunity] Successfully updated opportunity in store`)
  },
})
