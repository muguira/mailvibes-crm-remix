import { useState, useRef, useCallback, useEffect } from 'react'
import { EmailAIRepository } from '@/services/ai/repositories/EmailAIRepository'
import { TimelineActivity } from './use-timeline-activities-v2'
import { AIError, ContactInfo } from '@/services/ai'
import { toast } from './use-toast'

interface UseEmailAIOptions {
  providerName?: string
  showToasts?: boolean
}

// ✅ SINGLETON: Global instance management to prevent multiple initializations
let globalAIRepository: EmailAIRepository | null = null
let globalInitializationPromise: Promise<EmailAIRepository> | null = null
let initializationAttempted = false

// ✅ PERFORMANCE: Lazy initialization - only create when actually needed
const getAIRepository = async (providerName?: string): Promise<EmailAIRepository> => {
  // ✅ DIAGNOSTIC: Check for missing environment variables
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    const error = new Error(
      `🚨 AI Configuration Missing!\n\nPara usar funciones AI, necesitas:\n\n1. Crear archivo .env en la raíz del proyecto\n2. Agregar: VITE_GEMINI_API_KEY=tu_api_key_aqui\n3. Obtener API key en: https://aistudio.google.com/app/apikey\n4. Reiniciar el servidor (npm run dev)\n\nVariables disponibles:\n- VITE_AI_PROVIDER: ${import.meta.env.VITE_AI_PROVIDER || 'MISSING'}\n- VITE_GEMINI_API_KEY: ${import.meta.env.VITE_GEMINI_API_KEY ? 'SET' : 'MISSING'}\n- VITE_AI_MODEL: ${import.meta.env.VITE_AI_MODEL || 'MISSING'}`,
    )

    if (process.env.NODE_ENV === 'development') {
      console.error('❌ [getAIRepository] Missing AI environment variables')
    }

    throw error
  }

  // Return existing instance immediately
  if (globalAIRepository) {
    return globalAIRepository
  }

  // If initialization is in progress, wait for it
  if (globalInitializationPromise) {
    return globalInitializationPromise
  }

  // Prevent multiple simultaneous initialization attempts
  if (initializationAttempted) {
    const error = new Error('AI initialization already attempted and failed')
    throw error
  }

  // Start initialization
  initializationAttempted = true
  globalInitializationPromise = EmailAIRepository.getInstance(providerName)
    .then(repository => {
      globalAIRepository = repository
      globalInitializationPromise = null

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [AI] Successfully initialized')
      }

      return repository
    })
    .catch(error => {
      globalInitializationPromise = null
      // Don't reset initializationAttempted to prevent retry loops

      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [AI] Initialization failed:', error.message)
      }

      throw error
    })

  return globalInitializationPromise
}

export const useEmailAI = (options: UseEmailAIOptions = {}) => {
  // ✅ PERFORMANCE: Lazy state management - only initialize when needed
  const [initError, setInitError] = useState<AIError | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const repositoryRef = useRef<EmailAIRepository | null>(globalAIRepository)

  // ✅ PERFORMANCE: No automatic initialization - only when functions are called
  const ensureInitialized = useCallback(async (): Promise<EmailAIRepository> => {
    if (repositoryRef.current) {
      return repositoryRef.current
    }

    try {
      const repository = await getAIRepository(options.providerName)
      repositoryRef.current = repository
      setIsInitialized(true)
      setInitError(null)
      return repository
    } catch (error) {
      const aiError = error as AIError
      setInitError(aiError)
      setIsInitialized(false)
      throw aiError
    }
  }, [options.providerName])

  // ✅ AUTO-INITIALIZE: Check configuration on mount if env vars are available
  useEffect(() => {
    // Only auto-initialize if we have the required environment variables
    if (import.meta.env.VITE_GEMINI_API_KEY && !globalAIRepository && !initializationAttempted) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🚀 [useEmailAI] Auto-initializing AI with available env vars')
      }

      // Initialize in background without blocking the UI
      ensureInitialized().catch(error => {
        if (process.env.NODE_ENV === 'development') {
          console.log('ℹ️ [useEmailAI] Auto-initialization failed, will retry on demand:', error.message)
        }
      })
    }
  }, []) // Empty dependency array - only run once on mount

  // ✅ PERFORMANCE: Lazy AI operations - only initialize when actually called
  const summarizeThread = useCallback(
    async (emails: TimelineActivity[], contactInfo: ContactInfo): Promise<string | null> => {
      try {
        const repository = await ensureInitialized()
        const response = await repository.summarizeEmailThread(emails, contactInfo)
        return response.data
      } catch (error) {
        if (options.showToasts) {
          toast({
            title: 'AI Summary Failed',
            description: 'Failed to generate summary. Please try again.',
            variant: 'destructive',
          })
        }
        return null
      }
    },
    [ensureInitialized, options.showToasts],
  )

  const generatePositiveReply = useCallback(
    async (
      originalEmail: TimelineActivity,
      conversationHistory: TimelineActivity[],
      contactInfo: ContactInfo,
    ): Promise<string | null> => {
      try {
        const repository = await ensureInitialized()
        const response = await repository.generatePositiveReply(originalEmail, conversationHistory, contactInfo)
        return response.data
      } catch (error) {
        if (options.showToasts) {
          toast({
            title: 'AI Reply Failed',
            description: 'Failed to generate positive reply. Please try again.',
            variant: 'destructive',
          })
        }
        return null
      }
    },
    [ensureInitialized, options.showToasts],
  )

  const generateNegativeReply = useCallback(
    async (
      originalEmail: TimelineActivity,
      conversationHistory: TimelineActivity[],
      contactInfo: ContactInfo,
    ): Promise<string | null> => {
      try {
        const repository = await ensureInitialized()
        const response = await repository.generateNegativeReply(originalEmail, conversationHistory, contactInfo)
        return response.data
      } catch (error) {
        if (options.showToasts) {
          toast({
            title: 'AI Reply Failed',
            description: 'Failed to generate negative reply. Please try again.',
            variant: 'destructive',
          })
        }
        return null
      }
    },
    [ensureInitialized, options.showToasts],
  )

  const generateCustomReply = useCallback(
    async (
      originalEmail: TimelineActivity,
      conversationHistory: TimelineActivity[],
      contactInfo: ContactInfo,
      customPrompt: string,
    ): Promise<string | null> => {
      try {
        const repository = await ensureInitialized()
        const response = await repository.generateCustomReply(
          originalEmail,
          conversationHistory,
          contactInfo,
          customPrompt,
        )
        return response.data
      } catch (error) {
        if (options.showToasts) {
          toast({
            title: 'AI Reply Failed',
            description: 'Failed to generate custom reply. Please try again.',
            variant: 'destructive',
          })
        }
        return null
      }
    },
    [ensureInitialized, options.showToasts],
  )

  const getAutocompletion = useCallback(
    async (
      partialText: string,
      cursorPosition: number,
      emailBeingReplied: TimelineActivity | undefined,
      conversationHistory: TimelineActivity[],
      contactInfo: ContactInfo,
    ): Promise<string | null> => {
      try {
        const repository = await ensureInitialized()
        const response = await repository.getAutocompletion(
          partialText,
          cursorPosition,
          emailBeingReplied,
          conversationHistory,
          contactInfo,
        )
        return response.data
      } catch (error) {
        // Don't show toast for autocompletion failures (too noisy)
        return null
      }
    },
    [ensureInitialized],
  )

  // Mock state objects with expected structure
  const createMockState = () => ({
    data: null,
    loading: false,
    error: null,
    fromCache: false,
    provider: globalAIRepository ? 'gemini' : 'none',
  })

  // Provider management
  const switchProvider = useCallback(async (newProvider: string) => {
    // Reset global state to force re-initialization with new provider
    globalAIRepository = null
    globalInitializationPromise = null
    initializationAttempted = false
    repositoryRef.current = null
    setIsInitialized(false)
    setInitError(null)
  }, [])

  const validateConnection = useCallback(async (): Promise<boolean> => {
    try {
      await ensureInitialized()
      return true
    } catch {
      return false
    }
  }, [ensureInitialized])

  // Utility functions
  const clearCache = useCallback(() => {
    if (repositoryRef.current) {
      // Implement cache clearing if needed
    }
  }, [])

  const getStats = useCallback(() => {
    return repositoryRef.current
      ? {
          isInitialized: !!repositoryRef.current,
          provider: globalAIRepository ? 'gemini' : 'none',
          globalInstance: !!globalAIRepository,
        }
      : null
  }, [])

  // Helper properties
  const finalIsConfigured = !!globalAIRepository || isInitialized

  return {
    // Core AI operations
    summarizeThread,
    generatePositiveReply,
    generateNegativeReply,
    generateCustomReply,
    getAutocompletion,

    // State for each operation
    summary: createMockState(),
    reply: createMockState(),
    autocompletion: createMockState(),

    // Global state
    isLoading: false,
    initializationError: initError,

    // Provider management
    provider: {
      name: globalAIRepository ? 'gemini' : 'none',
      supportedModels: [],
      isConfigured: finalIsConfigured, // ✅ FIX: Use same logic as main isConfigured
    },
    switchProvider,
    validateConnection,

    // Utility functions
    clearSummary: useCallback(() => {}, []),
    clearReply: useCallback(() => {}, []),
    clearAutocompletion: useCallback(() => {}, []),
    clearAll: useCallback(() => {}, []),
    clearCache,
    getStats,

    // Helper properties
    isConfigured: finalIsConfigured,
    supportedModels: [],
  }
}
