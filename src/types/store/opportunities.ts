import { Opportunity } from '@/stores/useOpportunitiesSlice'

// =============================================
// TIPOS BASE Y INTERFACES AUXILIARES PARA EL ESTADO DE OPPORTUNITIES
// =============================================

// Estado de loading para operaciones específicas de opportunities
export interface IOpportunitiesLoadingState {
  fetching: boolean
  initializing: boolean
  backgroundLoading: boolean
}

// Estado de error para operaciones específicas de opportunities
export interface IOpportunitiesErrorState {
  fetch: string | null
  initialize: string | null
  update: string | null
  delete: string | null
  restore: string | null
}

// Estado de paginación para opportunities
export interface IOpportunitiesPaginationState {
  offset: number
  hasMore: boolean
  totalCount: number
  loadedCount: number
  firstBatchLoaded: boolean
  allOpportunitiesLoaded: boolean
  isInitialized: boolean
}

// Estado interno del slice (no persistente)
export interface IOpportunitiesInternalState {
  userId: string | null
  chunkSize: number
  backgroundLoadingActive: boolean
  backgroundLoadingPaused: boolean
}

// Configuración para retry logic
export interface IOpportunitiesRetryConfig {
  maxAttempts: number
  onRetry?: (error: Error, attempt: number) => void
}

// =============================================
// STORE PRINCIPAL DE OPPORTUNITIES
// =============================================

export interface TOpportunitiesStore {
  // Estado del cache de opportunities
  opportunitiesCache: Record<string, Opportunity>
  opportunitiesOrderedIds: string[]
  opportunitiesDeletedIds: Set<string> // Para persistir en localStorage via persist middleware

  // Estados de loading
  opportunitiesLoading: IOpportunitiesLoadingState

  // Estados de error
  opportunitiesErrors: IOpportunitiesErrorState

  // Estados de paginación
  opportunitiesPagination: IOpportunitiesPaginationState

  // Estado interno (no persistente)
  opportunitiesInternal: IOpportunitiesInternalState

  // =============================================
  // MÉTODOS PÚBLICOS
  // =============================================

  /**
   * Inicializa el store de opportunities con el primer batch de datos
   * @param userId - ID del usuario actual
   */
  opportunitiesInitialize: (userId: string) => Promise<void>

  /**
   * Obtiene el siguiente chunk de opportunities
   */
  opportunitiesFetchNext: () => Promise<void>

  /**
   * Inicia la carga en background de opportunities restantes
   */
  opportunitiesStartBackgroundLoading: () => Promise<void>

  /**
   * Pausa la carga en background
   */
  opportunitiesPauseBackgroundLoading: () => void

  /**
   * Reanuda la carga en background
   */
  opportunitiesResumeBackgroundLoading: () => void

  /**
   * Asegura que se hayan cargado el mínimo de opportunities requeridos
   * Se usa cuando el usuario selecciona page sizes grandes (500, 1000)
   * @param minimumRequired - Número mínimo de opportunities que deben estar cargados
   */
  opportunitiesEnsureMinimumLoaded: (minimumRequired: number) => Promise<void>

  /**
   * Limpia todo el cache (usado en logout)
   */
  opportunitiesClear: () => void

  /**
   * Fuerza un refresh completo del cache
   */
  opportunitiesForceRefresh: () => Promise<void>

  /**
   * Remueve opportunities del cache y los marca como eliminados
   * @param opportunityIds - Array de IDs de opportunities a remover
   */
  opportunitiesRemoveOpportunities: (opportunityIds: string[]) => void

  /**
   * Restaura opportunities al cache (usado cuando falla la eliminación en DB)
   * @param opportunities - Array de opportunities a restaurar
   */
  opportunitiesRestoreOpportunities: (opportunities: Opportunity[]) => void

  /**
   * Agrega un nuevo opportunity al cache
   * @param opportunity - Opportunity a agregar
   */
  opportunitiesAddOpportunity: (opportunity: Opportunity) => void

  /**
   * Actualiza un opportunity existente en el cache
   * @param opportunityId - ID del opportunity a actualizar
   * @param updates - Campos a actualizar
   */
  opportunitiesUpdateOpportunity: (opportunityId: string, updates: Partial<Opportunity>) => void
}

// =============================================
// TIPOS AUXILIARES
// =============================================

// Input para crear opportunity
export type TCreateOpportunityInput = Omit<Opportunity, 'id'>

// Input para actualizar opportunity
export type TUpdateOpportunityInput = Partial<Opportunity> & { id: string }

// Configuración de paginación
export interface IOpportunitiesPaginationConfig {
  firstBatchSize: number
  chunkSize: number
}

// Resultado de operación de opportunities
export interface IOpportunitiesOperationResult {
  success: boolean
  error?: string
  data?: any
} 