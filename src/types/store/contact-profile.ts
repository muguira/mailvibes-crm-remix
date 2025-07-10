import { Contact } from "@/hooks/supabase/use-contacts";

// =============================================
// TIPOS BASE Y INTERFACES AUXILIARES
// =============================================

// Detalles del contacto para el formulario de edición
export interface IContactDetails {
  firstName: string;
  lastName: string;
  emails: IContactField[];
  phones: IContactField[];
  addresses: IContactAddress[];
  linkedin: string;
  company: string;
  title: string;
}

// Campo de contacto (email, phone)
export interface IContactField {
  id: string;
  value: string;
  isPrimary: boolean;
  type: string;
}

// Dirección del contacto
export interface IContactAddress {
  id: string;
  value: string;
  isPrimary: boolean;
}

// Modos de edición disponibles
export type TEditMode = "details" | "experience" | null;

// Tipos de entrada para operaciones
export type TContactDetailsInput = Omit<
  IContactDetails,
  "emails" | "phones" | "addresses"
> & {
  emails: Omit<IContactField, "id">[];
  phones: Omit<IContactField, "id">[];
  addresses: Omit<IContactAddress, "id">[];
};

export type TUpdateContactInput = {
  contactId: string;
  details: IContactDetails;
};

// =============================================
// ESTADOS DE CARGA
// =============================================

export interface IContactProfileLoadingState {
  fetching: boolean;
  updating: boolean;
  fetchingActivities: boolean;
  fetchingEmails: boolean;
}

// =============================================
// ESTADOS DE ERROR
// =============================================

export interface IContactProfileErrorState {
  fetch: string | null;
  update: string | null;
  fetchActivities: string | null;
  fetchEmails: string | null;
}

// =============================================
// CONFIGURACIÓN DE REINTENTO
// =============================================

export interface IContactProfileRetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
}

// =============================================
// FILTROS Y OPCIONES
// =============================================

export interface IActivityFilters {
  type?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  source?: string[];
}

export interface ITimelineOptions {
  includeEmails: boolean;
  maxEmails: number;
  autoRefresh: boolean;
  refreshInterval: number;
}

// =============================================
// ESTADO DEL CONTACT PROFILE
// =============================================

export interface IContactProfileState {
  // Datos del contacto
  contact: Contact | null;
  contactDetails: IContactDetails;

  // Estados de UI
  editMode: TEditMode;

  // Estados de carga
  loading: IContactProfileLoadingState;

  // Estados de error
  errors: IContactProfileErrorState;

  // Configuración
  retryConfig: IContactProfileRetryConfig;

  // Filtros y opciones
  activityFilters: IActivityFilters;
  timelineOptions: ITimelineOptions;

  // Flags de estado
  isInitialized: boolean;
  lastSyncAt: string | null;
  currentContactId: string | null;
}

// =============================================
// ACCIONES DEL CONTACT PROFILE
// =============================================

export interface IContactProfileActions {
  // --- INICIALIZACIÓN ---
  initialize: (contactId: string) => Promise<void>;
  reset: () => void;

  // --- OPERACIONES DE CONTACTO ---
  fetchContact: (contactId: string) => Promise<void>;
  updateContactDetails: (input: TUpdateContactInput) => Promise<void>;

  // --- GESTIÓN DE ESTADOS UI ---
  setEditMode: (mode: TEditMode) => void;
  setContactDetails: (details: Partial<IContactDetails>) => void;

  // --- UTILIDADES ---
  getPrimaryEmail: () => string;
  getPrimaryPhone: () => string;
  getPrimaryAddress: () => string;

  // --- FILTROS Y OPCIONES ---
  setActivityFilters: (filters: Partial<IActivityFilters>) => void;
  setTimelineOptions: (options: Partial<ITimelineOptions>) => void;

  // --- MANEJO DE ERRORES ---
  clearError: (operation: keyof IContactProfileErrorState) => void;
  clearAllErrors: () => void;

  // --- CONFIGURACIÓN ---
  setRetryConfig: (config: Partial<IContactProfileRetryConfig>) => void;
}

// =============================================
// STORE COMBINADO DE CONTACT PROFILE
// =============================================

// Store que combina estado y acciones con prefijos para evitar conflictos
export type TContactProfileStore = {
  // Contact Profile state with contactProfile prefix to avoid conflicts
  contactProfileContact: Contact | null;
  contactProfileContactDetails: IContactDetails;
  contactProfileEditMode: TEditMode;
  contactProfileLoading: IContactProfileLoadingState;
  contactProfileErrors: IContactProfileErrorState;
  contactProfileRetryConfig: IContactProfileRetryConfig;
  contactProfileActivityFilters: IActivityFilters;
  contactProfileTimelineOptions: ITimelineOptions;
  contactProfileIsInitialized: boolean;
  contactProfileLastSyncAt: string | null;
  contactProfileCurrentContactId: string | null;

  // Contact Profile actions with contactProfile prefix
  contactProfileInitialize: (contactId: string) => Promise<void>;
  contactProfileReset: () => void;
  contactProfileFetchContact: (contactId: string) => Promise<void>;
  contactProfileUpdateContactDetails: (
    input: TUpdateContactInput
  ) => Promise<void>;
  contactProfileSetEditMode: (mode: TEditMode) => void;
  contactProfileSetContactDetails: (details: Partial<IContactDetails>) => void;
  contactProfileGetPrimaryEmail: () => string;
  contactProfileGetPrimaryPhone: () => string;
  contactProfileGetPrimaryAddress: () => string;
  contactProfileSetActivityFilters: (
    filters: Partial<IActivityFilters>
  ) => void;
  contactProfileSetTimelineOptions: (
    options: Partial<ITimelineOptions>
  ) => void;
  contactProfileClearError: (
    operation: keyof IContactProfileErrorState
  ) => void;
  contactProfileClearAllErrors: () => void;
  contactProfileSetRetryConfig: (
    config: Partial<IContactProfileRetryConfig>
  ) => void;
};
