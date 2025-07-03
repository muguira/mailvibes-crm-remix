import React, { useEffect, ReactNode } from "react";
import { useAuthStore } from "@/hooks/useAuthStore";
import { useStore } from "@/stores";
import { logger } from "@/utils/logger";

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider component that replaces the old AuthContext
 * 
 * This component:
 * - Initializes the auth state from Zustand
 * - Handles the auth state change listener setup
 * - Provides loading state while auth is initializing
 * - Automatically integrates with contacts store and tasks store
 * 
 * @example
 * ```typescript
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * ```
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { isInitialized, initialize, loading, errors } = useAuthStore();
  const store = useStore();

  // Initialize auth state
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const initAuth = async () => {
      if (!isInitialized && !loading.initializing) {
        logger.log('AuthProvider: Initializing auth state...');
        try {
          await initialize();
        } catch (error) {
          logger.error('AuthProvider: Failed to initialize auth state:', error);
          // Si hay un error, intentamos reinicializar después de 2 segundos
          timeoutId = setTimeout(initAuth, 2000);
        }
      }
    };

    initAuth();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isInitialized, initialize, loading.initializing]);

  // Initialize tasks when user is authenticated
  useEffect(() => {
    const user = store.authUser;
    const tasksInitialized = store.isInitialized;

    if (user && !tasksInitialized && !store.loading.fetching) {
      logger.log('AuthProvider: Initializing tasks for user:', user.id);
      store.initialize();
    }
  }, [store.authUser, store.isInitialized, store.loading.fetching]);

  // Solo mostramos el loading si estamos en el proceso inicial de carga
  if (loading.initializing && !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Initializing authentication...</p>
          {errors.initialize && (
            <p className="mt-2 text-sm text-red-600">{errors.initialize}</p>
          )}
        </div>
      </div>
    );
  }

  // Si hay un error de inicialización pero ya no estamos cargando, mostramos el contenido
  // esto evita que nos quedemos atascados en el estado de carga
  return <>{children}</>;
};

 