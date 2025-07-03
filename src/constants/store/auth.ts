import {
  IAuthState,
  IAuthErrorState,
  IAuthLoadingState,
  IAuthRetryConfig,
} from "@/types/store/auth";

// =============================================
// ESTADO INICIAL DE AUTH
// =============================================

export const INITIAL_AUTH_STATE: IAuthState = {
  // Estado de la sesión
  session: null,
  user: null,

  // Estado de carga
  loading: {
    signingIn: false,
    signingUp: false,
    signingOut: false,
    resettingPassword: false,
    updatingPassword: false,
    initializing: false,
  },

  // Estado de errores
  errors: {
    signIn: null,
    signUp: null,
    signOut: null,
    resetPassword: null,
    updatePassword: null,
    initialize: null,
  },

  // Estado de inicialización
  isInitialized: false,

  // Timestamp de última sincronización
  lastSyncAt: null,

  // Configuración de reintento
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2,
  },

  // Estado de verificación de email
  isEmailVerified: false,

  // Estado de recuperación de contraseña
  isPasswordResetRequested: false,
};

// =============================================
// ESTADO DE RESETEO DE AUTH
// =============================================

export const RESET_AUTH_STATE: IAuthState = {
  ...INITIAL_AUTH_STATE,
  session: null,
  user: null,
  isInitialized: false,
  lastSyncAt: null,
  isEmailVerified: false,
  isPasswordResetRequested: false,
};

// =============================================
// CONFIGURACIONES DE REINTENTO
// =============================================

export const DEFAULT_AUTH_RETRY_CONFIG: IAuthRetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
};

export const AGGRESSIVE_AUTH_RETRY_CONFIG: IAuthRetryConfig = {
  maxRetries: 5,
  retryDelay: 500,
  backoffMultiplier: 1.5,
};

export const CONSERVATIVE_AUTH_RETRY_CONFIG: IAuthRetryConfig = {
  maxRetries: 2,
  retryDelay: 2000,
  backoffMultiplier: 3,
};

// =============================================
// MENSAJES DE ERROR PREDEFINIDOS
// =============================================

export const AUTH_ERROR_MESSAGES = {
  SIGN_IN_FAILED: "Failed to sign in. Please check your credentials.",
  SIGN_UP_FAILED: "Failed to create account. Please try again.",
  SIGN_OUT_FAILED: "Failed to sign out. Please try again.",
  PASSWORD_RESET_FAILED: "Failed to send password reset email.",
  PASSWORD_UPDATE_FAILED: "Failed to update password.",
  SESSION_REFRESH_FAILED: "Failed to refresh session.",
  INITIALIZATION_FAILED: "Failed to initialize authentication.",
  NETWORK_ERROR: "Network error. Please check your connection.",
  INVALID_CREDENTIALS: "Invalid email or password.",
  EMAIL_NOT_VERIFIED: "Please verify your email address before signing in.",
  ACCOUNT_DISABLED: "Your account has been disabled.",
  TOO_MANY_REQUESTS: "Too many requests. Please try again later.",
} as const;

// =============================================
// MENSAJES DE ÉXITO PREDEFINIDOS
// =============================================

export const AUTH_SUCCESS_MESSAGES = {
  SIGN_IN_SUCCESS: "Welcome back! You have successfully signed in.",
  SIGN_UP_SUCCESS:
    "Account created successfully. Please check your email for verification.",
  SIGN_OUT_SUCCESS: "You have successfully signed out.",
  PASSWORD_RESET_SENT: "Password reset email sent. Please check your inbox.",
  PASSWORD_UPDATED: "Password updated successfully.",
  EMAIL_VERIFIED: "Email verified successfully.",
} as const;

// =============================================
// CONFIGURACIONES DE VALIDACIÓN
// =============================================

export const AUTH_VALIDATION_CONFIG = {
  MIN_PASSWORD_LENGTH: 7,
  MAX_PASSWORD_LENGTH: 128,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{7,}$/,
} as const;

// =============================================
// TIMEOUTS Y DELAYS
// =============================================

export const AUTH_TIMEOUTS = {
  SESSION_REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
  PASSWORD_RESET_EXPIRY: 60 * 60 * 1000, // 1 hour
  EMAIL_VERIFICATION_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  AUTO_LOGOUT_DELAY: 30 * 60 * 1000, // 30 minutes of inactivity
} as const;
