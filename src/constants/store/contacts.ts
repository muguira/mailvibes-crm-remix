import {
  IContactsLoadingState,
  IContactsErrorState,
  IContactsPaginationState,
  IContactsInternalState,
  IContactsRetryConfig,
} from '@/types/store/contacts'
import { logger } from '@/utils/logger'
import { toast } from '@/hooks/use-toast'

// =============================================
// CONSTANTES DE CONFIGURACIÓN
// =============================================

export const CONTACTS_CONFIG = {
  FIRST_BATCH_SIZE: 20, // Primer batch - carga inmediata (optimizado para una vista de página)
  CHUNK_SIZE: 1000, // Chunks en background
  MAX_RETRY_ATTEMPTS: 3,
  BACKGROUND_LOADING_DELAY: 100, // ms entre chunks para mantener UI responsive
  REHYDRATION_TIMEOUT: 2000, // ms para timeout de rehydration
} as const

// =============================================
// CLAVES DE STORAGE
// =============================================

export const CONTACTS_STORAGE_KEYS = {
  CONTACTS_STATE: 'contacts-state',
  DELETED_CONTACT_IDS: 'deleted-contact-ids', // Para migración del formato anterior
} as const

// =============================================
// ESTADOS INICIALES
// =============================================

export const INITIAL_CONTACTS_LOADING_STATE: IContactsLoadingState = {
  fetching: false,
  initializing: false,
  backgroundLoading: false,
}

export const INITIAL_CONTACTS_ERROR_STATE: IContactsErrorState = {
  fetch: null,
  initialize: null,
  update: null,
  delete: null,
  restore: null,
}

export const INITIAL_CONTACTS_PAGINATION_STATE: IContactsPaginationState = {
  offset: 0,
  hasMore: true,
  totalCount: 0,
  loadedCount: 0,
  firstBatchLoaded: false,
  allContactsLoaded: false,
  isInitialized: false,
}

export const INITIAL_CONTACTS_INTERNAL_STATE: IContactsInternalState = {
  userId: null,
  chunkSize: CONTACTS_CONFIG.CHUNK_SIZE,
  backgroundLoadingActive: false,
  backgroundLoadingPaused: false,
}

// =============================================
// ESTADO INICIAL COMPLETO
// =============================================

export const INITIAL_CONTACTS_STATE = {
  contactsCache: {} as Record<string, any>,
  contactsOrderedIds: [] as string[],
  contactsDeletedIds: new Set<string>(),
  contactsLoading: INITIAL_CONTACTS_LOADING_STATE,
  contactsErrors: INITIAL_CONTACTS_ERROR_STATE,
  contactsPagination: INITIAL_CONTACTS_PAGINATION_STATE,
  contactsInternal: INITIAL_CONTACTS_INTERNAL_STATE,
} as const

// =============================================
// ESTADO DE RESET (para logout)
// =============================================

export const RESET_CONTACTS_STATE = {
  contactsCache: {},
  contactsOrderedIds: [],
  // Mantener contactsDeletedIds después del logout
  contactsLoading: INITIAL_CONTACTS_LOADING_STATE,
  contactsErrors: INITIAL_CONTACTS_ERROR_STATE,
  contactsPagination: INITIAL_CONTACTS_PAGINATION_STATE,
  contactsInternal: INITIAL_CONTACTS_INTERNAL_STATE,
} as const

// =============================================
// CONFIGURACIÓN DE RETRY
// =============================================

export const DEFAULT_CONTACTS_RETRY_CONFIG: IContactsRetryConfig = {
  maxAttempts: CONTACTS_CONFIG.MAX_RETRY_ATTEMPTS,
  onRetry: (error, attempt) => {
    logger.log(`Retrying contacts operation (attempt ${attempt})...`)
    if (attempt === 2) {
      toast({
        title: 'Connection issues',
        description: 'Having trouble loading contacts. Retrying...',
        variant: 'default',
      })
    }
  },
}

// =============================================
// MENSAJES DE ERROR
// =============================================

export const CONTACTS_ERROR_MESSAGES = {
  FETCH_FAILED: 'Failed to fetch contacts from server',
  INITIALIZE_FAILED: 'Failed to initialize contacts store',
  UPDATE_FAILED: 'Failed to update contact',
  DELETE_FAILED: 'Failed to delete contacts',
  RESTORE_FAILED: 'Failed to restore contacts',
  BACKGROUND_LOADING_FAILED: 'Background loading encountered errors',
  NETWORK_ERROR: 'Network error while loading contacts',
  PERMISSION_ERROR: 'Permission denied while accessing contacts',
  TIMEOUT_ERROR: 'Request timeout while loading contacts',
  INVALID_USER: 'Cannot perform operation: No authenticated user',
  INVALID_CONTACT: 'Invalid contact data provided',
} as const

// =============================================
// MENSAJES DE ÉXITO
// =============================================

export const CONTACTS_SUCCESS_MESSAGES = {
  INITIALIZED: 'Contacts loaded successfully',
  UPDATED: 'Contact updated successfully',
  DELETED: 'Contacts deleted successfully',
  RESTORED: 'Contacts restored successfully',
  BACKGROUND_LOADING_COMPLETE: 'All contacts loaded successfully',
  CACHE_REFRESHED: 'Contacts cache refreshed',
} as const

// =============================================
// CONFIGURACIÓN DE PERSIST MIDDLEWARE
// =============================================

export const CONTACTS_PERSIST_CONFIG = {
  name: CONTACTS_STORAGE_KEYS.CONTACTS_STATE,
  version: 1,
  // Solo persistir los IDs eliminados y estado básico de inicialización
  partialize: (state: any) => ({
    contactsDeletedIds: Array.from(state.contactsDeletedIds || []), // Convertir Set a Array para JSON
    contactsPagination: {
      isInitialized: state.contactsPagination?.isInitialized || false,
    },
  }),
  // Migración desde el formato anterior (localStorage manual)
  migrate: (persistedState: any, version: number) => {
    if (version === 0) {
      // Migrar desde localStorage manual
      try {
        const oldDeletedIds = localStorage.getItem(CONTACTS_STORAGE_KEYS.DELETED_CONTACT_IDS)
        if (oldDeletedIds) {
          const ids = JSON.parse(oldDeletedIds)
          persistedState.contactsDeletedIds = ids
          localStorage.removeItem(CONTACTS_STORAGE_KEYS.DELETED_CONTACT_IDS) // Limpiar formato viejo
          logger.log(`Migrated ${ids.length} deleted contact IDs from old format`)
        }
      } catch (error) {
        logger.error('Error migrating deleted contact IDs:', error)
      }
    }
    return persistedState
  },
  // Merge personalizado para manejar Sets
  merge: (persistedState: any, currentState: any) => ({
    ...currentState,
    ...persistedState,
    contactsDeletedIds: new Set(persistedState.contactsDeletedIds || []), // Convertir Array de vuelta a Set
  }),
} as const
