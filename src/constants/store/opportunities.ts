import {
  IOpportunitiesLoadingState,
  IOpportunitiesErrorState,
  IOpportunitiesPaginationState,
  IOpportunitiesInternalState,
  IOpportunitiesRetryConfig,
} from '@/types/store/opportunities'
import { logger } from '@/utils/logger'
import { toast } from '@/hooks/use-toast'

// =============================================
// CONSTANTES DE CONFIGURACIÓN
// =============================================

export const OPPORTUNITIES_CONFIG = {
  FIRST_BATCH_SIZE: 20, // Primer batch - carga inmediata (optimizado para una vista de página)
  CHUNK_SIZE: 1000, // Chunks en background
  MAX_RETRY_ATTEMPTS: 3,
  BACKGROUND_LOADING_DELAY: 100, // ms entre chunks para mantener UI responsive
  REHYDRATION_TIMEOUT: 2000, // ms para timeout de rehydration
} as const

// =============================================
// CLAVES DE STORAGE
// =============================================

export const OPPORTUNITIES_STORAGE_KEYS = {
  OPPORTUNITIES_STATE: 'opportunities-state',
  DELETED_OPPORTUNITY_IDS: 'deleted-opportunity-ids', // Para migración del formato anterior
} as const

// =============================================
// ESTADOS INICIALES
// =============================================

export const INITIAL_OPPORTUNITIES_LOADING_STATE: IOpportunitiesLoadingState = {
  fetching: false,
  initializing: false,
  backgroundLoading: false,
}

export const INITIAL_OPPORTUNITIES_ERROR_STATE: IOpportunitiesErrorState = {
  fetch: null,
  initialize: null,
  update: null,
  delete: null,
  restore: null,
}

export const INITIAL_OPPORTUNITIES_PAGINATION_STATE: IOpportunitiesPaginationState = {
  offset: 0,
  hasMore: true,
  totalCount: 0,
  loadedCount: 0,
  firstBatchLoaded: false,
  allOpportunitiesLoaded: false,
  isInitialized: false,
}

export const INITIAL_OPPORTUNITIES_INTERNAL_STATE: IOpportunitiesInternalState = {
  userId: null,
  chunkSize: OPPORTUNITIES_CONFIG.CHUNK_SIZE,
  backgroundLoadingActive: false,
  backgroundLoadingPaused: false,
}

// =============================================
// ESTADO INICIAL COMPLETO
// =============================================

export const INITIAL_OPPORTUNITIES_STATE = {
  opportunitiesCache: {} as Record<string, any>,
  opportunitiesOrderedIds: [] as string[],
  opportunitiesDeletedIds: new Set<string>(),
  opportunitiesLoading: INITIAL_OPPORTUNITIES_LOADING_STATE,
  opportunitiesErrors: INITIAL_OPPORTUNITIES_ERROR_STATE,
  opportunitiesPagination: INITIAL_OPPORTUNITIES_PAGINATION_STATE,
  opportunitiesInternal: INITIAL_OPPORTUNITIES_INTERNAL_STATE,
} as const

// =============================================
// ESTADO DE RESET (para logout)
// =============================================

export const RESET_OPPORTUNITIES_STATE = {
  opportunitiesCache: {},
  opportunitiesOrderedIds: [],
  // Mantener opportunitiesDeletedIds después del logout
  opportunitiesLoading: INITIAL_OPPORTUNITIES_LOADING_STATE,
  opportunitiesErrors: INITIAL_OPPORTUNITIES_ERROR_STATE,
  opportunitiesPagination: INITIAL_OPPORTUNITIES_PAGINATION_STATE,
  opportunitiesInternal: INITIAL_OPPORTUNITIES_INTERNAL_STATE,
} as const

// =============================================
// CONFIGURACIÓN DE RETRY
// =============================================

export const DEFAULT_OPPORTUNITIES_RETRY_CONFIG: IOpportunitiesRetryConfig = {
  maxAttempts: OPPORTUNITIES_CONFIG.MAX_RETRY_ATTEMPTS,
  onRetry: (error, attempt) => {
    logger.log(`Retrying opportunities operation (attempt ${attempt})...`)
    if (attempt === 2) {
      toast({
        title: 'Connection issues',
        description: 'Having trouble loading opportunities. Retrying...',
        variant: 'default',
      })
    }
  },
}

// =============================================
// MENSAJES DE ERROR
// =============================================

export const OPPORTUNITIES_ERROR_MESSAGES = {
  FETCH_FAILED: 'Failed to fetch opportunities from server',
  INITIALIZE_FAILED: 'Failed to initialize opportunities store',
  UPDATE_FAILED: 'Failed to update opportunity',
  DELETE_FAILED: 'Failed to delete opportunities',
  RESTORE_FAILED: 'Failed to restore opportunities',
  BACKGROUND_LOADING_FAILED: 'Background loading encountered errors',
  NETWORK_ERROR: 'Network error while loading opportunities',
  PERMISSION_ERROR: 'Permission denied while accessing opportunities',
  TIMEOUT_ERROR: 'Request timeout while loading opportunities',
  INVALID_USER: 'Cannot perform operation: No authenticated user',
  INVALID_OPPORTUNITY: 'Invalid opportunity data provided',
} as const

// =============================================
// MENSAJES DE ÉXITO
// =============================================

export const OPPORTUNITIES_SUCCESS_MESSAGES = {
  INITIALIZED: 'Opportunities loaded successfully',
  UPDATED: 'Opportunity updated successfully',
  DELETED: 'Opportunities deleted successfully',
  RESTORED: 'Opportunities restored successfully',
  BACKGROUND_LOADING_COMPLETE: 'All opportunities loaded successfully',
  CACHE_REFRESHED: 'Opportunities cache refreshed',
} as const

// =============================================
// CONFIGURACIÓN DE PERSIST MIDDLEWARE
// =============================================

export const OPPORTUNITIES_PERSIST_CONFIG = {
  name: OPPORTUNITIES_STORAGE_KEYS.OPPORTUNITIES_STATE,
  version: 1,
  // Solo persistir los IDs eliminados y estado básico de inicialización
  partialize: (state: any) => ({
    opportunitiesDeletedIds: Array.from(state.opportunitiesDeletedIds || []), // Convertir Set a Array para JSON
    opportunitiesPagination: {
      isInitialized: state.opportunitiesPagination?.isInitialized || false,
    },
  }),
  // Migración desde el formato anterior (localStorage manual)
  migrate: (persistedState: any, version: number) => {
    if (version === 0) {
      // Migrar desde localStorage manual
      try {
        const oldDeletedIds = localStorage.getItem(OPPORTUNITIES_STORAGE_KEYS.DELETED_OPPORTUNITY_IDS)
        if (oldDeletedIds) {
          const ids = JSON.parse(oldDeletedIds)
          persistedState.opportunitiesDeletedIds = ids
          localStorage.removeItem(OPPORTUNITIES_STORAGE_KEYS.DELETED_OPPORTUNITY_IDS) // Limpiar formato viejo
          logger.log(`Migrated ${ids.length} deleted opportunity IDs from old format`)
        }
      } catch (error) {
        logger.error('Error migrating deleted opportunity IDs:', error)
      }
    }
    return persistedState
  },
  // Merge personalizado para manejar Sets
  merge: (persistedState: any, currentState: any) => ({
    ...currentState,
    ...persistedState,
    opportunitiesDeletedIds: new Set(persistedState.opportunitiesDeletedIds || []), // Convertir Array de vuelta a Set
  }),
} as const 