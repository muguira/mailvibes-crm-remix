import { useCallback, useEffect, useRef, useState } from 'react'
import { EmailAIRepository } from '@/services/ai/repositories/EmailAIRepository'
import {
  AIError,
  EmailThreadContext,
  EmailReplyContext,
  AutocompleteContext,
  AIOptions,
} from '@/services/ai/providers/base/types'
import { ContactInfo, EmailAIOptions } from '@/services/ai/index'
import { TimelineActivity } from './use-timeline-activities-v2'
import { toast } from '@/hooks/use-toast'
import { logger } from '@/utils/logger'

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
  // ✅ PERFORMANCE: TEMPORARILY DISABLED to eliminate AI Provider initialization during performance testing
  const repositoryRef = useRef<EmailAIRepository | null>(null)
  const [initError, setInitError] = useState<AIError | null>(null)
  const [isInitialized, setIsInitialized] = useState(true) // ✅ Mark as initialized to prevent any initialization

  // ✅ DISABLED: No AI initialization during performance testing
  // useEffect(() => {
  //   // AI initialization is temporarily disabled
  // }, [])

  // ✅ DISABLED: Remove development logging to reduce console spam
  // if (process.env.NODE_ENV === 'development') {
  //   console.log('[useEmailAI] AI Provider initialization DISABLED for performance testing')
  // }

  // Return AI functions that do nothing but maintain expected interface
  const summarizeThread = useCallback(
    async (emails: TimelineActivity[], contactInfo: ContactInfo): Promise<string | null> => {
      return 'AI temporarily disabled for performance testing'
    },
    [],
  )

  const generatePositiveReply = useCallback(
    async (
      originalEmail: TimelineActivity,
      conversationHistory: TimelineActivity[],
      contactInfo: ContactInfo,
    ): Promise<string | null> => {
      return 'AI temporarily disabled for performance testing'
    },
    [],
  )

  const generateNegativeReply = useCallback(
    async (
      originalEmail: TimelineActivity,
      conversationHistory: TimelineActivity[],
      contactInfo: ContactInfo,
    ): Promise<string | null> => {
      return 'AI temporarily disabled for performance testing'
    },
    [],
  )

  const generateCustomReply = useCallback(
    async (
      originalEmail: TimelineActivity,
      conversationHistory: TimelineActivity[],
      contactInfo: ContactInfo,
      customPrompt: string,
    ): Promise<string | null> => {
      return 'AI temporarily disabled for performance testing'
    },
    [],
  )

  const getAutocompletion = useCallback(
    async (
      partialText: string,
      cursorPosition: number,
      emailBeingReplied: TimelineActivity | undefined,
      conversationHistory: TimelineActivity[],
      contactInfo: ContactInfo,
    ): Promise<string | null> => {
      return ''
    },
    [],
  )

  // Mock state objects with expected structure
  const mockState = {
    data: null,
    loading: false,
    error: null,
    fromCache: false,
    provider: 'disabled',
  }

  const mockProviderInfo = {
    name: 'disabled',
    isConfigured: false,
    rateLimitInfo: null,
    supportedModels: [],
  }

  // No-op functions
  const switchProvider = useCallback(() => {}, [])
  const clearSummary = useCallback(() => {}, [])
  const clearReply = useCallback(() => {}, [])
  const clearAutocompletion = useCallback(() => {}, [])
  const clearAll = useCallback(() => {}, [])
  const clearCache = useCallback(() => {}, [])
  const validateConnection = useCallback(async () => false, [])
  const getStats = useCallback(() => null, [])

  return {
    // Core AI operations
    summarizeThread,
    generatePositiveReply,
    generateNegativeReply,
    generateCustomReply,
    getAutocompletion,

    // State for each operation - MAINTAIN EXPECTED STRUCTURE
    summary: mockState,
    reply: mockState,
    autocompletion: mockState,

    // Global state
    isLoading: false,
    initializationError: null,

    // Provider management
    provider: mockProviderInfo,
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
    isConfigured: false, // AI is disabled
    supportedModels: [],
  }
}
