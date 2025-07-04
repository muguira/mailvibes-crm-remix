import { Session, User } from "@supabase/supabase-js";

// =============================================
// TIPOS DE ENTRADA PARA OPERACIONES DE AUTH
// =============================================

export interface TSignInInput {
  email: string;
  password: string;
}

export interface TSignUpInput {
  email: string;
  password: string;
}

export interface TResetPasswordInput {
  email: string;
}

export interface TUpdatePasswordInput {
  password: string;
}

// =============================================
// TIPOS DE ESTADO DE CARGA
// =============================================

export interface IAuthLoadingState {
  signingIn: boolean;
  signingUp: boolean;
  signingOut: boolean;
  resettingPassword: boolean;
  updatingPassword: boolean;
  initializing: boolean;
}

// =============================================
// TIPOS DE ESTADO DE ERROR
// =============================================

export interface IAuthErrorState {
  signIn: string | null;
  signUp: string | null;
  signOut: string | null;
  resetPassword: string | null;
  updatePassword: string | null;
  initialize: string | null;
}

// =============================================
// TIPOS DE CONFIGURACIÓN DE REINTENTO
// =============================================

export interface IAuthRetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
}

// =============================================
// TIPOS DE ESTADO DE AUTH
// =============================================

export interface IAuthState {
  // Estado de la sesión
  session: Session | null;
  user: User | null;

  // Estado de carga
  loading: IAuthLoadingState;

  // Estado de errores
  errors: IAuthErrorState;

  // Estado de inicialización
  isInitialized: boolean;

  // Timestamp de última sincronización
  lastSyncAt: string | null;

  // Configuración de reintento
  retryConfig: IAuthRetryConfig;

  // Estado de verificación de email
  isEmailVerified: boolean;

  // Estado de recuperación de contraseña
  isPasswordResetRequested: boolean;
}

// =============================================
// TIPOS DE ACCIONES DE AUTH
// =============================================

export interface IAuthActions {
  // Inicialización
  initialize: () => Promise<void>;
  reset: () => void;

  // Operaciones de autenticación
  signIn: (credentials: TSignInInput) => Promise<void>;
  signUp: (credentials: TSignUpInput) => Promise<void>;
  signOut: () => Promise<void>;

  // Operaciones de contraseña
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;

  // Operaciones de sesión
  refreshSession: () => Promise<void>;
  getSession: () => Promise<Session | null>;

  // Operaciones de usuario
  updateUserProfile: (updates: Partial<User>) => Promise<void>;

  // Gestión de errores
  clearError: (operation: keyof IAuthErrorState) => void;
  clearAllErrors: () => void;

  // Configuración
  setRetryConfig: (config: Partial<IAuthRetryConfig>) => void;

  // Utilidades
  isAuthenticated: () => boolean;
  getUserRole: () => string | null;
  hasPermission: (permission: string) => boolean;
}

// =============================================
// TIPO COMPLETO DEL AUTH STORE
// =============================================

export type TAuthStore = {
  // Auth state with auth prefix to avoid conflicts
  authSession: Session | null;
  authUser: User | null;
  authIsInitialized: boolean;
  authLastSyncAt: string | null;
  authIsEmailVerified: boolean;
  authIsPasswordResetRequested: boolean;
  authLoading: IAuthLoadingState;
  authErrors: IAuthErrorState;
  authRetryConfig: IAuthRetryConfig;

  // Auth actions with auth prefix
  authInitialize: () => Promise<void>;
  authReset: () => void;
  authSignIn: (credentials: TSignInInput) => Promise<void>;
  authSignUp: (credentials: TSignUpInput) => Promise<void>;
  authSignOut: () => Promise<void>;
  authResetPassword: (email: string) => Promise<void>;
  authUpdatePassword: (password: string) => Promise<void>;
  authRefreshSession: () => Promise<void>;
  authGetSession: () => Promise<Session | null>;
  authUpdateUserProfile: (updates: Partial<User>) => Promise<void>;
  authIsAuthenticated: () => boolean;
  authGetUserRole: () => string | null;
  authHasPermission: (permission: string) => boolean;
  authClearError: (operation: keyof IAuthErrorState) => void;
  authClearAllErrors: () => void;
  authSetRetryConfig: (config: Partial<IAuthRetryConfig>) => void;
};
