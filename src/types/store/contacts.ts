import { LeadContact } from '@/components/stream/sample-data'

// =============================================
// TIPOS BASE Y INTERFACES AUXILIARES PARA EL ESTADO DE CONTACTS
// =============================================

// Estado de loading para operaciones específicas de contacts
export interface IContactsLoadingState {
  fetching: boolean
  initializing: boolean
  backgroundLoading: boolean
}

// Estado de error para operaciones específicas de contacts
export interface IContactsErrorState {
  fetch: string | null
  initialize: string | null
  update: string | null
  delete: string | null
  restore: string | null
}

// Estado de paginación para contacts
export interface IContactsPaginationState {
  offset: number
  hasMore: boolean
  totalCount: number
  loadedCount: number
  firstBatchLoaded: boolean
  allContactsLoaded: boolean
  isInitialized: boolean
}

// Estado interno del slice (no persistente)
export interface IContactsInternalState {
  userId: string | null
  chunkSize: number
  backgroundLoadingActive: boolean
  backgroundLoadingPaused: boolean
}

// Configuración para retry logic
export interface IContactsRetryConfig {
  maxAttempts: number
  onRetry?: (error: Error, attempt: number) => void
}

// =============================================
// STORE PRINCIPAL DE CONTACTS
// =============================================

export interface TContactsStore {
  // Estado del cache de contacts
  contactsCache: Record<string, LeadContact>
  contactsOrderedIds: string[]
  contactsDeletedIds: Set<string> // Para persistir en localStorage via persist middleware

  // Estados de loading
  contactsLoading: IContactsLoadingState

  // Estados de error
  contactsErrors: IContactsErrorState

  // Estados de paginación
  contactsPagination: IContactsPaginationState

  // Estado interno (no persistente)
  contactsInternal: IContactsInternalState

  // =============================================
  // MÉTODOS PÚBLICOS
  // =============================================

  /**
   * Inicializa el store de contacts con el primer batch de datos
   * @param userId - ID del usuario actual
   */
  contactsInitialize: (userId: string) => Promise<void>

  /**
   * Obtiene el siguiente chunk de contacts
   */
  contactsFetchNext: () => Promise<void>

  /**
   * Inicia la carga en background de contacts restantes
   */
  contactsStartBackgroundLoading: () => Promise<void>

  /**
   * Pausa la carga en background
   */
  contactsPauseBackgroundLoading: () => void

  /**
   * Reanuda la carga en background
   */
  contactsResumeBackgroundLoading: () => void

  /**
   * Limpia todo el cache (usado en logout)
   */
  contactsClear: () => void

  /**
   * Fuerza un refresh completo del cache
   */
  contactsForceRefresh: () => Promise<void>

  /**
   * Remueve contacts del cache y los marca como eliminados
   * @param contactIds - Array de IDs de contacts a remover
   */
  contactsRemoveContacts: (contactIds: string[]) => void

  /**
   * Restaura contacts al cache (usado cuando falla la eliminación en DB)
   * @param contacts - Array de contacts a restaurar
   */
  contactsRestoreContacts: (contacts: LeadContact[]) => void

  /**
   * Agrega un nuevo contact al cache
   * @param contact - Contact a agregar
   */
  contactsAddContact: (contact: LeadContact) => void

  /**
   * Actualiza un contact existente en el cache
   * @param contactId - ID del contact a actualizar
   * @param updates - Campos a actualizar
   */
  contactsUpdateContact: (contactId: string, updates: Partial<LeadContact>) => void
}

// =============================================
// TIPOS AUXILIARES
// =============================================

// Input para crear contact
export type TCreateContactInput = Omit<LeadContact, 'id'>

// Input para actualizar contact
export type TUpdateContactInput = Partial<LeadContact> & { id: string }

// Configuración de paginación
export interface IContactsPaginationConfig {
  firstBatchSize: number
  chunkSize: number
}

// Resultado de operación de contacts
export interface IContactsOperationResult {
  success: boolean
  error?: string
  data?: any
}
