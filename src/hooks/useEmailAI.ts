import { useState, useCallback, useRef, useEffect } from 'react'
import { EmailAIRepository } from '@/services/ai/repositories/EmailAIRepository'
import { ContactInfo, AIResponse, EmailAIOptions } from '@/services/ai'
import { AIError } from '@/services/ai/providers/base/types'
import { TimelineActivity } from '@/hooks/use-timeline-activities-v2'
import { logger } from '@/utils/logger'
import { toast } from '@/hooks/use-toast'

interface UseEmailAIOptions extends EmailAIOptions {
  showToasts?: boolean
  autoRetry?: boolean
  maxRetries?: number
}

interface AIOperationState<T> {
  data: T | null
  loading: boolean
  error: AIError | null
  fromCache: boolean
  provider: string
}

export const useEmailAI = (options: UseEmailAIOptions = {}) => {
  // Repository instance - stable across re-renders
  const repositoryRef = useRef<EmailAIRepository | null>(null)
  const [initError, setInitError] = useState<AIError | null>(null)

  // Safely initialize repository
  if (!repositoryRef.current && !initError) {
    try {
      repositoryRef.current = new EmailAIRepository(options.defaultProvider, options)
    } catch (error) {
      logger.error('[useEmailAI] Failed to initialize repository:', error)
      const aiError =
        error instanceof AIError
          ? error
          : new AIError(`Failed to initialize AI: ${error.message}`, 'INITIALIZATION_FAILED')
      setInitError(aiError)
    }
  }

  // State for different AI operations
  const [summaryState, setSummaryState] = useState<AIOperationState<string>>({
    data: null,
    loading: false,
    error: null,
    fromCache: false,
    provider: '',
  })

  const [replyState, setReplyState] = useState<AIOperationState<string>>({
    data: null,
    loading: false,
    error: null,
    fromCache: false,
    provider: '',
  })

  const [autocompleteState, setAutocompleteState] = useState<AIOperationState<string>>({
    data: null,
    loading: false,
    error: null,
    fromCache: false,
    provider: '',
  })

  // Global loading state for any AI operation
  const [isAnyLoading, setIsAnyLoading] = useState(false)

  // Provider information
  const [providerInfo, setProviderInfo] = useState(
    () =>
      repositoryRef.current?.getCurrentProvider() || {
        name: 'unknown',
        isConfigured: false,
        rateLimitInfo: null,
        supportedModels: [],
      },
  )

  // Update global loading state
  useEffect(() => {
    const anyLoading = summaryState.loading || replyState.loading || autocompleteState.loading
    setIsAnyLoading(anyLoading)
  }, [summaryState.loading, replyState.loading, autocompleteState.loading])

  // Helper function to handle AI operations with error handling and retries
  const executeAIOperation = useCallback(
    async <T>(
      operation: () => Promise<AIResponse<T>>,
      setState: React.Dispatch<React.SetStateAction<AIOperationState<T>>>,
      operationName: string,
      showToast = options.showToasts !== false,
    ): Promise<T | null> => {
      let retries = 0
      const maxRetries = options.maxRetries || 1

      while (retries <= maxRetries) {
        try {
          setState(prev => ({ ...prev, loading: true, error: null }))

          const result = await operation()

          setState({
            data: result.data,
            loading: false,
            error: null,
            fromCache: result.fromCache,
            provider: result.provider,
          })

          // Update provider info
          if (repositoryRef.current) {
            setProviderInfo(repositoryRef.current.getCurrentProvider())
          }

          if (showToast && !result.fromCache) {
            toast({
              title: `${operationName} completed`,
              description: `AI response generated successfully`,
            })
          }

          logger.log(`[useEmailAI] ${operationName} successful:`, {
            fromCache: result.fromCache,
            provider: result.provider,
            retries,
          })

          return result.data
        } catch (error) {
          logger.error(`[useEmailAI] ${operationName} failed (attempt ${retries + 1}):`, error)

          const aiError =
            error instanceof AIError ? error : new AIError(`${operationName} failed: ${error.message}`, 'UNKNOWN_ERROR')

          // Check if we should retry
          const shouldRetry =
            options.autoRetry !== false &&
            retries < maxRetries &&
            (aiError.code === 'TIMEOUT' || aiError.code === 'RATE_LIMIT_EXCEEDED')

          if (shouldRetry) {
            retries++

            // Wait before retry (exponential backoff)
            const delay = Math.min(1000 * Math.pow(2, retries - 1), 5000)
            await new Promise(resolve => setTimeout(resolve, delay))

            logger.log(`[useEmailAI] Retrying ${operationName} in ${delay}ms (attempt ${retries + 1})`)
            continue
          }

          // Final failure
          setState(prev => ({
            ...prev,
            loading: false,
            error: aiError,
          }))

          if (showToast) {
            toast({
              title: `${operationName} failed`,
              description: aiError.message,
              variant: 'destructive',
            })
          }

          return null
        }
      }

      return null
    },
    [options.showToasts, options.autoRetry, options.maxRetries],
  )

  // Summarize email thread
  const summarizeThread = useCallback(
    async (emails: TimelineActivity[], contactInfo: ContactInfo): Promise<string | null> => {
      if (initError) {
        logger.error('[useEmailAI] Cannot summarize - initialization failed:', initError)
        setSummaryState(prev => ({ ...prev, error: initError, loading: false }))
        return null
      }

      if (!repositoryRef.current) {
        throw new Error('AI repository not initialized')
      }

      return executeAIOperation(
        () => repositoryRef.current!.summarizeEmailThread(emails, contactInfo),
        setSummaryState,
        'Email thread summary',
      )
    },
    [executeAIOperation, initError],
  )

  // Generate positive reply
  const generatePositiveReply = useCallback(
    async (
      originalEmail: TimelineActivity,
      conversationHistory: TimelineActivity[],
      contactInfo: ContactInfo,
    ): Promise<string | null> => {
      if (!repositoryRef.current) {
        throw new Error('AI repository not initialized')
      }

      return executeAIOperation(
        () => repositoryRef.current!.generatePositiveReply(originalEmail, conversationHistory, contactInfo),
        setReplyState,
        'Positive reply generation',
      )
    },
    [executeAIOperation],
  )

  // Generate negative reply
  const generateNegativeReply = useCallback(
    async (
      originalEmail: TimelineActivity,
      conversationHistory: TimelineActivity[],
      contactInfo: ContactInfo,
    ): Promise<string | null> => {
      if (!repositoryRef.current) {
        throw new Error('AI repository not initialized')
      }

      return executeAIOperation(
        () => repositoryRef.current!.generateNegativeReply(originalEmail, conversationHistory, contactInfo),
        setReplyState,
        'Negative reply generation',
      )
    },
    [executeAIOperation],
  )

  // Generate custom reply
  const generateCustomReply = useCallback(
    async (
      originalEmail: TimelineActivity,
      conversationHistory: TimelineActivity[],
      contactInfo: ContactInfo,
      customPrompt: string,
    ): Promise<string | null> => {
      if (!repositoryRef.current) {
        throw new Error('AI repository not initialized')
      }

      return executeAIOperation(
        () => repositoryRef.current!.generateCustomReply(originalEmail, conversationHistory, contactInfo, customPrompt),
        setReplyState,
        'Custom reply generation',
      )
    },
    [executeAIOperation],
  )

  // Get autocompletion
  const getAutocompletion = useCallback(
    async (
      partialText: string,
      cursorPosition: number,
      emailBeingReplied: TimelineActivity | undefined,
      conversationHistory: TimelineActivity[],
      contactInfo: ContactInfo,
    ): Promise<string | null> => {
      if (!repositoryRef.current) {
        throw new Error('AI repository not initialized')
      }

      return executeAIOperation(
        () =>
          repositoryRef.current!.getAutocompletion(
            partialText,
            cursorPosition,
            emailBeingReplied,
            conversationHistory,
            contactInfo,
          ),
        setAutocompleteState,
        'Autocompletion',
        false, // Don't show toast for autocompletion
      )
    },
    [executeAIOperation],
  )

  // Switch AI provider
  const switchProvider = useCallback(
    (providerName: string) => {
      if (!repositoryRef.current) {
        throw new Error('AI repository not initialized')
      }

      try {
        repositoryRef.current.switchProvider(providerName)
        setProviderInfo(repositoryRef.current.getCurrentProvider())

        if (options.showToasts !== false) {
          toast({
            title: 'AI Provider switched',
            description: `Now using ${providerName}`,
          })
        }

        logger.log(`[useEmailAI] Switched to provider: ${providerName}`)
      } catch (error) {
        logger.error(`[useEmailAI] Failed to switch provider:`, error)

        if (options.showToasts !== false) {
          toast({
            title: 'Provider switch failed',
            description: error.message,
            variant: 'destructive',
          })
        }
      }
    },
    [options.showToasts],
  )

  // Clear specific operation state
  const clearSummary = useCallback(() => {
    setSummaryState({
      data: null,
      loading: false,
      error: null,
      fromCache: false,
      provider: '',
    })
  }, [])

  const clearReply = useCallback(() => {
    setReplyState({
      data: null,
      loading: false,
      error: null,
      fromCache: false,
      provider: '',
    })
  }, [])

  const clearAutocompletion = useCallback(() => {
    setAutocompleteState({
      data: null,
      loading: false,
      error: null,
      fromCache: false,
      provider: '',
    })
  }, [])

  // Clear all states
  const clearAll = useCallback(() => {
    clearSummary()
    clearReply()
    clearAutocompletion()
  }, [clearSummary, clearReply, clearAutocompletion])

  // Validate AI connection
  const validateConnection = useCallback(async (): Promise<boolean> => {
    if (!repositoryRef.current) {
      return false
    }

    try {
      const isValid = await repositoryRef.current.validateConnection()

      if (options.showToasts !== false) {
        toast({
          title: isValid ? 'AI connection valid' : 'AI connection failed',
          description: isValid
            ? `Successfully connected to ${providerInfo.name}`
            : `Cannot connect to ${providerInfo.name}`,
          variant: isValid ? 'default' : 'destructive',
        })
      }

      return isValid
    } catch (error) {
      logger.error('[useEmailAI] Connection validation failed:', error)
      return false
    }
  }, [options.showToasts, providerInfo.name])

  // Get repository statistics
  const getStats = useCallback(() => {
    if (!repositoryRef.current) {
      return null
    }

    return repositoryRef.current.getStats()
  }, [])

  // Clear cache
  const clearCache = useCallback(() => {
    if (!repositoryRef.current) {
      return
    }

    repositoryRef.current.clearCache()

    if (options.showToasts !== false) {
      toast({
        title: 'AI cache cleared',
        description: 'All cached AI responses have been cleared',
      })
    }
  }, [options.showToasts])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (repositoryRef.current) {
        repositoryRef.current.dispose()
        repositoryRef.current = null
      }
    }
  }, [])

  return {
    // Core AI operations
    summarizeThread,
    generatePositiveReply,
    generateNegativeReply,
    generateCustomReply,
    getAutocompletion,

    // State for each operation
    summary: summaryState,
    reply: replyState,
    autocompletion: autocompleteState,

    // Global state
    isLoading: isAnyLoading,
    initializationError: initError,

    // Provider management
    provider: providerInfo,
    switchProvider,
    validateConnection,

    // Utility functions
    clearSummary,
    clearReply,
    clearAutocompletion,
    clearAll,
    clearCache,
    getStats,

    // Helper functions for components
    isConfigured: !initError && providerInfo.isConfigured,
    supportedModels: providerInfo.supportedModels,
  }
}
