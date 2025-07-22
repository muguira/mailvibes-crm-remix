import {
  IContactDetails,
  IContactProfileLoadingState,
  IContactProfileErrorState,
  IContactProfileRetryConfig,
  IActivityFilters,
  ITimelineOptions,
  TEditMode,
} from '@/types/store/contact-profile'

// =============================================
// CONSTANTES DE ESTADO INICIAL
// =============================================

export const INITIAL_CONTACT_DETAILS: IContactDetails = {
  firstName: '',
  lastName: '',
  emails: [],
  phones: [],
  addresses: [],
  linkedin: '',
  company: '',
  title: '',
}

export const INITIAL_EDIT_MODE: TEditMode = null

export const INITIAL_LOADING_STATE: IContactProfileLoadingState = {
  fetching: false,
  updating: false,
  fetchingActivities: false,
  fetchingEmails: false,
}

export const INITIAL_ERROR_STATE: IContactProfileErrorState = {
  fetch: null,
  update: null,
  fetchActivities: null,
  fetchEmails: null,
}

export const DEFAULT_RETRY_CONFIG: IContactProfileRetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
}

export const INITIAL_ACTIVITY_FILTERS: IActivityFilters = {}

export const DEFAULT_TIMELINE_OPTIONS: ITimelineOptions = {
  includeEmails: true,
  maxEmails: 20,
  autoRefresh: false,
  refreshInterval: 30000, // 30 seconds
}

export const INITIAL_IS_INITIALIZED = false
export const INITIAL_LAST_SYNC_AT: string | null = null
export const INITIAL_CURRENT_CONTACT_ID: string | null = null

// =============================================
// ESTADO INICIAL COMPLETO
// =============================================

export const INITIAL_CONTACT_PROFILE_STATE = {
  // Datos del contacto
  contactProfileContact: null,
  contactProfileContactDetails: INITIAL_CONTACT_DETAILS,

  // Estados de UI
  contactProfileEditMode: INITIAL_EDIT_MODE,

  // Estados de carga
  contactProfileLoading: INITIAL_LOADING_STATE,

  // Estados de error
  contactProfileErrors: INITIAL_ERROR_STATE,

  // Configuración
  contactProfileRetryConfig: DEFAULT_RETRY_CONFIG,

  // Filtros y opciones
  contactProfileActivityFilters: INITIAL_ACTIVITY_FILTERS,
  contactProfileTimelineOptions: DEFAULT_TIMELINE_OPTIONS,

  // Flags de estado
  contactProfileIsInitialized: INITIAL_IS_INITIALIZED,
  contactProfileLastSyncAt: INITIAL_LAST_SYNC_AT,
  contactProfileCurrentContactId: INITIAL_CURRENT_CONTACT_ID,
} as const

// =============================================
// CONSTANTES PARA RESET
// =============================================

export const RESET_CONTACT_PROFILE_STATE = {
  contactProfileContact: null,
  contactProfileContactDetails: INITIAL_CONTACT_DETAILS,
  contactProfileEditMode: null,
  contactProfileLoading: {
    fetching: false,
    updating: false,
    fetchingActivities: false,
    fetchingEmails: false,
  },
  contactProfileErrors: {
    fetch: null,
    update: null,
    fetchActivities: null,
    fetchEmails: null,
  },
  contactProfileActivityFilters: {},
  contactProfileIsInitialized: false,
  contactProfileLastSyncAt: null,
  contactProfileCurrentContactId: null,
} as const

// =============================================
// MENSAJES DE ERROR PREDEFINIDOS
// =============================================

export const CONTACT_PROFILE_ERROR_MESSAGES = {
  FETCH_FAILED: 'Failed to load contact data',
  UPDATE_FAILED: 'Failed to update contact details',
  CONTACT_NOT_FOUND: 'Contact not found',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  PERMISSION_DENIED: "You don't have permission to access this contact",
  INVALID_CONTACT_ID: 'Invalid contact ID provided',
  ACTIVITIES_FETCH_FAILED: 'Failed to load contact activities',
  EMAILS_FETCH_FAILED: 'Failed to load contact emails',
} as const

// =============================================
// MENSAJES DE ÉXITO PREDEFINIDOS
// =============================================

export const CONTACT_PROFILE_SUCCESS_MESSAGES = {
  UPDATE_SUCCESS: 'Contact details have been updated successfully',
  FETCH_SUCCESS: 'Contact data loaded successfully',
  ACTIVITIES_LOADED: 'Contact activities loaded successfully',
  EMAILS_LOADED: 'Contact emails loaded successfully',
} as const

// =============================================
// CONFIGURACIONES DE VALIDACIÓN
// =============================================

export const CONTACT_PROFILE_VALIDATION_CONFIG = {
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: 100,
  MAX_TITLE_LENGTH: 100,
  MAX_COMPANY_LENGTH: 100,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^[\+]?[1-9][\d]{0,15}$/,
  LINKEDIN_REGEX: /^(https?:\/\/)?([\w]+\.)?linkedin\.com\/(pub|in|profile)/,
} as const

// =============================================
// TIMEOUTS Y DELAYS
// =============================================

export const CONTACT_PROFILE_TIMEOUTS = {
  FETCH_TIMEOUT: 10000, // 10 seconds
  UPDATE_TIMEOUT: 15000, // 15 seconds
  ACTIVITIES_TIMEOUT: 8000, // 8 seconds
  EMAILS_TIMEOUT: 12000, // 12 seconds
  DEBOUNCE_DELAY: 500, // 500ms for input debouncing
} as const
