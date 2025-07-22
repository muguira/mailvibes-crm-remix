import { AIProvider } from '../providers/base/AIProvider'
import { AIResponse, AIError, EmailAIOptions, ContactInfo } from '../providers/base/types'
import { AIProviderFactory } from '../factories/AIProviderFactory'
import { EmailContextBuilder } from '../context/EmailContextBuilder'
import { TimelineActivity } from '@/hooks/use-timeline-activities-v2'
import { logger } from '@/utils/logger'

interface CachedAIResponse<T> {
  data: T
  timestamp: number
  expiresAt: number
  provider: string
  cacheKey: string
}

export class EmailAIRepository {
  private provider: AIProvider
  private contextBuilder: EmailContextBuilder
  private cache: Map<string, CachedAIResponse<any>> = new Map()
  private options: EmailAIOptions

  constructor(providerName?: string, options: EmailAIOptions = {}) {
    this.options = {
      cacheEnabled: true,
      cacheTTL: 10 * 60 * 1000, // 10 minutes
      rateLimitEnabled: true,
      maxRequestsPerMinute: 10,
      ...options,
    }

    this.provider = AIProviderFactory.create(providerName || this.options.defaultProvider)
    this.contextBuilder = new EmailContextBuilder()

    logger.log('[EmailAIRepository] Initialized with provider:', this.provider.name)
  }

  /**
   * Summarize an email thread
   */
  async summarizeEmailThread(emails: TimelineActivity[], contactInfo: ContactInfo): Promise<AIResponse<string>> {
    const operation = 'summarizeThread'
    const cacheKey = this.generateCacheKey(operation, { emails: emails.map(e => e.id), contactInfo })

    // Check cache first
    if (this.options.cacheEnabled) {
      const cached = this.getFromCache<string>(cacheKey)
      if (cached) {
        logger.log(`[EmailAIRepository] Cache hit for ${operation}`)
        return {
          data: cached.data,
          fromCache: true,
          provider: cached.provider,
        }
      }
    }

    try {
      // Build context
      const context = this.contextBuilder.buildThreadContext(emails, contactInfo)

      // Validate context
      if (!this.contextBuilder.validateThreadContext(context)) {
        throw new AIError('Invalid thread context for summarization', 'INVALID_CONTEXT')
      }

      logger.log(`[EmailAIRepository] Generating thread summary for ${context.emails.length} emails`)

      // Call AI provider
      const summary = await this.provider.summarizeEmailThread(context)

      // Cache result
      if (this.options.cacheEnabled) {
        this.setCache(cacheKey, summary, this.provider.name)
      }

      logger.log(`[EmailAIRepository] Thread summary generated successfully`)

      return {
        data: summary,
        fromCache: false,
        provider: this.provider.name,
      }
    } catch (error) {
      logger.error(`[EmailAIRepository] Failed to summarize thread:`, error)

      if (error instanceof AIError) {
        throw error
      }

      throw new AIError(
        `Failed to summarize email thread: ${error.message}`,
        'SUMMARIZATION_FAILED',
        this.provider.name,
        error,
      )
    }
  }

  /**
   * Generate a positive reply to an email
   */
  async generatePositiveReply(
    originalEmail: TimelineActivity,
    conversationHistory: TimelineActivity[],
    contactInfo: ContactInfo,
  ): Promise<AIResponse<string>> {
    return this.generateReply(originalEmail, conversationHistory, contactInfo, 'positive')
  }

  /**
   * Generate a negative reply to an email
   */
  async generateNegativeReply(
    originalEmail: TimelineActivity,
    conversationHistory: TimelineActivity[],
    contactInfo: ContactInfo,
  ): Promise<AIResponse<string>> {
    return this.generateReply(originalEmail, conversationHistory, contactInfo, 'negative')
  }

  /**
   * Generate a custom reply based on user prompt
   */
  async generateCustomReply(
    originalEmail: TimelineActivity,
    conversationHistory: TimelineActivity[],
    contactInfo: ContactInfo,
    customPrompt: string,
  ): Promise<AIResponse<string>> {
    const operation = 'generateCustomReply'
    const cacheKey = this.generateCacheKey(operation, {
      originalEmailId: originalEmail.id,
      contactInfo,
      customPrompt,
    })

    // Check cache (less likely to hit for custom prompts, but still useful)
    if (this.options.cacheEnabled) {
      const cached = this.getFromCache<string>(cacheKey)
      if (cached) {
        logger.log(`[EmailAIRepository] Cache hit for ${operation}`)
        return {
          data: cached.data,
          fromCache: true,
          provider: cached.provider,
        }
      }
    }

    try {
      // Build context
      const context = this.contextBuilder.buildReplyContext(originalEmail, conversationHistory, contactInfo, 'custom')

      // Validate context
      if (!this.contextBuilder.validateReplyContext(context)) {
        throw new AIError('Invalid reply context for custom reply generation', 'INVALID_CONTEXT')
      }

      logger.log(`[EmailAIRepository] Generating custom reply with prompt: "${customPrompt.substring(0, 50)}..."`)

      // Call AI provider
      const reply = await this.provider.generateCustomReply(context, customPrompt)

      // Cache result
      if (this.options.cacheEnabled) {
        this.setCache(cacheKey, reply, this.provider.name)
      }

      logger.log(`[EmailAIRepository] Custom reply generated successfully`)

      return {
        data: reply,
        fromCache: false,
        provider: this.provider.name,
      }
    } catch (error) {
      logger.error(`[EmailAIRepository] Failed to generate custom reply:`, error)

      if (error instanceof AIError) {
        throw error
      }

      throw new AIError(
        `Failed to generate custom reply: ${error.message}`,
        'CUSTOM_REPLY_FAILED',
        this.provider.name,
        error,
      )
    }
  }

  /**
   * Get autocompletion suggestions
   */
  async getAutocompletion(
    partialText: string,
    cursorPosition: number,
    emailBeingReplied: TimelineActivity | undefined,
    conversationHistory: TimelineActivity[],
    contactInfo: ContactInfo,
  ): Promise<AIResponse<string>> {
    // No caching for autocompletion as it's highly context-sensitive
    const operation = 'getAutocompletion'

    try {
      // Build context
      const context = this.contextBuilder.buildAutocompleteContext(
        partialText,
        cursorPosition,
        emailBeingReplied,
        conversationHistory,
        contactInfo,
      )

      // Validate context
      if (!this.contextBuilder.validateAutocompleteContext(context)) {
        throw new AIError('Invalid context for autocompletion', 'INVALID_CONTEXT')
      }

      logger.log(
        `[EmailAIRepository] Generating autocompletion for text: "${partialText.substring(Math.max(0, partialText.length - 30))}"`,
      )

      // Call AI provider
      const completion = await this.provider.getAutocompletion(context)

      logger.log(`[EmailAIRepository] Autocompletion generated: "${completion.substring(0, 50)}..."`)

      return {
        data: completion,
        fromCache: false,
        provider: this.provider.name,
      }
    } catch (error) {
      logger.error(`[EmailAIRepository] Failed to get autocompletion:`, error)

      if (error instanceof AIError) {
        throw error
      }

      throw new AIError(
        `Failed to get autocompletion: ${error.message}`,
        'AUTOCOMPLETION_FAILED',
        this.provider.name,
        error,
      )
    }
  }

  /**
   * Common method for positive and negative replies
   */
  private async generateReply(
    originalEmail: TimelineActivity,
    conversationHistory: TimelineActivity[],
    contactInfo: ContactInfo,
    replyType: 'positive' | 'negative',
  ): Promise<AIResponse<string>> {
    const operation = `generate${replyType.charAt(0).toUpperCase() + replyType.slice(1)}Reply`
    const cacheKey = this.generateCacheKey(operation, {
      originalEmailId: originalEmail.id,
      contactInfo,
      replyType,
    })

    // Check cache
    if (this.options.cacheEnabled) {
      const cached = this.getFromCache<string>(cacheKey)
      if (cached) {
        logger.log(`[EmailAIRepository] Cache hit for ${operation}`)
        return {
          data: cached.data,
          fromCache: true,
          provider: cached.provider,
        }
      }
    }

    try {
      // Build context
      const context = this.contextBuilder.buildReplyContext(originalEmail, conversationHistory, contactInfo, replyType)

      // Validate context
      if (!this.contextBuilder.validateReplyContext(context)) {
        throw new AIError(`Invalid reply context for ${replyType} reply generation`, 'INVALID_CONTEXT')
      }

      logger.log(`[EmailAIRepository] Generating ${replyType} reply`)

      // Call appropriate provider method
      const reply =
        replyType === 'positive'
          ? await this.provider.generatePositiveReply(context)
          : await this.provider.generateNegativeReply(context)

      // Cache result
      if (this.options.cacheEnabled) {
        this.setCache(cacheKey, reply, this.provider.name)
      }

      logger.log(`[EmailAIRepository] ${replyType} reply generated successfully`)

      return {
        data: reply,
        fromCache: false,
        provider: this.provider.name,
      }
    } catch (error) {
      logger.error(`[EmailAIRepository] Failed to generate ${replyType} reply:`, error)

      if (error instanceof AIError) {
        throw error
      }

      throw new AIError(
        `Failed to generate ${replyType} reply: ${error.message}`,
        'REPLY_GENERATION_FAILED',
        this.provider.name,
        error,
      )
    }
  }

  /**
   * Switch AI provider dynamically
   */
  switchProvider(providerName: string): void {
    try {
      const newProvider = AIProviderFactory.create(providerName)
      this.provider.dispose() // Clean up old provider
      this.provider = newProvider

      logger.log(`[EmailAIRepository] Switched to provider: ${providerName}`)
    } catch (error) {
      logger.error(`[EmailAIRepository] Failed to switch provider to ${providerName}:`, error)
      throw new AIError(
        `Failed to switch to provider '${providerName}': ${error.message}`,
        'PROVIDER_SWITCH_FAILED',
        providerName,
        error,
      )
    }
  }

  /**
   * Get current provider information
   */
  getCurrentProvider(): {
    name: string
    isConfigured: boolean
    rateLimitInfo: any
    supportedModels: string[]
  } {
    return {
      name: this.provider.name,
      isConfigured: this.provider.isConfigured(),
      rateLimitInfo: this.provider.getRateLimitInfo(),
      supportedModels: this.provider.supportedModels,
    }
  }

  /**
   * Get repository statistics
   */
  getStats() {
    return {
      provider: this.getCurrentProvider(),
      cache: {
        size: this.cache.size,
        enabled: this.options.cacheEnabled,
        ttl: this.options.cacheTTL,
      },
      options: this.options,
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
    logger.log('[EmailAIRepository] Cache cleared')
  }

  /**
   * Validate connection to AI provider
   */
  async validateConnection(): Promise<boolean> {
    try {
      return await this.provider.validateConnection()
    } catch (error) {
      logger.error('[EmailAIRepository] Connection validation failed:', error)
      return false
    }
  }

  // Private utility methods

  private generateCacheKey(operation: string, data: any): string {
    // Create a stable cache key from the operation and data
    const dataStr = JSON.stringify(data, Object.keys(data).sort())

    // Use TextEncoder to handle UTF-8 characters safely
    const encoder = new TextEncoder()
    const encodedData = encoder.encode(dataStr)

    // Create a simple hash from the encoded data
    let hash = 0
    for (let i = 0; i < encodedData.length; i++) {
      hash = ((hash << 5) - hash + encodedData[i]) & 0xffffffff
    }

    // Convert to a safe string representation
    const hashStr = Math.abs(hash).toString(36).substring(0, 32)
    return `ai:${this.provider.name}:${operation}:${hashStr}`
  }

  private getFromCache<T>(key: string): CachedAIResponse<T> | null {
    const cached = this.cache.get(key)

    if (!cached) return null

    // Check expiration
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return cached as CachedAIResponse<T>
  }

  private setCache<T>(key: string, data: T, provider: string): void {
    const expiresAt = Date.now() + (this.options.cacheTTL || 10 * 60 * 1000)

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt,
      provider,
      cacheKey: key,
    })

    // Simple cleanup: remove expired entries when cache gets large
    if (this.cache.size > 100) {
      this.cleanupExpiredCache()
    }
  }

  private cleanupExpiredCache(): void {
    const now = Date.now()
    let removedCount = 0

    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.expiresAt) {
        this.cache.delete(key)
        removedCount++
      }
    }

    if (removedCount > 0) {
      logger.log(`[EmailAIRepository] Cleaned up ${removedCount} expired cache entries`)
    }
  }

  /**
   * Dispose repository and cleanup resources
   */
  dispose(): void {
    this.provider?.dispose()
    this.cache.clear()
    logger.log('[EmailAIRepository] Repository disposed')
  }
}
