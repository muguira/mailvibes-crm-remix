import {
  EmailThreadContext,
  EmailReplyContext,
  AutocompleteContext,
  AIOptions,
  AIResponse,
  RateLimitInfo,
  AIError,
  ProviderConfig,
  CachedResponse,
} from './types'
import { logger } from '@/utils/logger'

export interface AIProvider {
  readonly name: string
  readonly supportedModels: string[]

  // Core AI operations
  summarizeEmailThread(context: EmailThreadContext, options?: AIOptions): Promise<string>
  generatePositiveReply(context: EmailReplyContext, options?: AIOptions): Promise<string>
  generateNegativeReply(context: EmailReplyContext, options?: AIOptions): Promise<string>
  generateCustomReply(context: EmailReplyContext, prompt: string, options?: AIOptions): Promise<string>
  getAutocompletion(context: AutocompleteContext, options?: AIOptions): Promise<string>

  // Provider management
  isConfigured(): boolean
  validateConnection(): Promise<boolean>
  getRateLimitInfo(): RateLimitInfo

  // Lifecycle
  dispose(): void
}

// Rate limiter helper class
class RateLimiter {
  private requests: number[] = []

  constructor(
    private maxRequests: number,
    private windowMs: number = 60000,
  ) {}

  canMakeRequest(): boolean {
    const now = Date.now()
    this.requests = this.requests.filter(time => now - time < this.windowMs)
    return this.requests.length < this.maxRequests
  }

  recordRequest(): void {
    this.requests.push(Date.now())
  }

  getInfo(): RateLimitInfo {
    const now = Date.now()
    this.requests = this.requests.filter(time => now - time < this.windowMs)
    const resetTime = this.requests.length > 0 ? Math.max(...this.requests) + this.windowMs : now

    return {
      requestsRemaining: Math.max(0, this.maxRequests - this.requests.length),
      resetTime,
      maxRequests: this.maxRequests,
    }
  }
}

// Simple cache implementation
class SimpleCache {
  private cache: Map<string, CachedResponse> = new Map()

  constructor(private ttl: number = 10 * 60 * 1000) {} // 10 minutes default

  get(key: string): string | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return cached.response
  }

  set(key: string, value: string, usage?: any): void {
    this.cache.set(key, {
      response: value,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.ttl,
      usage,
    })
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

export abstract class BaseAIProvider implements AIProvider {
  abstract readonly name: string
  abstract readonly supportedModels: string[]

  protected rateLimiter: RateLimiter
  protected cache: SimpleCache
  protected config: ProviderConfig

  constructor(config: ProviderConfig, maxRequestsPerMinute: number = 10) {
    this.config = config
    this.rateLimiter = new RateLimiter(maxRequestsPerMinute)
    this.cache = new SimpleCache()
  }

  // Abstract method that each provider must implement
  protected abstract callAI(
    prompt: string,
    options?: AIOptions,
  ): Promise<{
    response: string
    usage?: any
  }>

  // Common implementation for all operations
  async summarizeEmailThread(context: EmailThreadContext, options?: AIOptions): Promise<string> {
    const cacheKey = this.generateCacheKey('summary', context)

    // Check cache first
    const cached = this.cache.get(cacheKey)
    if (cached) {
      logger.log(`[${this.name}] Cache hit for email thread summary`)
      return cached
    }

    const prompt = this.buildSummaryPrompt(context)
    return this.executeWithRateLimit(prompt, { ...options, maxTokens: 150, temperature: 0.3 }, cacheKey)
  }

  async generatePositiveReply(context: EmailReplyContext, options?: AIOptions): Promise<string> {
    const cacheKey = this.generateCacheKey('positive-reply', context)
    const cached = this.cache.get(cacheKey)
    if (cached) return cached

    const prompt = this.buildPositiveReplyPrompt(context)
    return this.executeWithRateLimit(prompt, { ...options, maxTokens: 300, temperature: 0.7 }, cacheKey)
  }

  async generateNegativeReply(context: EmailReplyContext, options?: AIOptions): Promise<string> {
    const cacheKey = this.generateCacheKey('negative-reply', context)
    const cached = this.cache.get(cacheKey)
    if (cached) return cached

    const prompt = this.buildNegativeReplyPrompt(context)
    return this.executeWithRateLimit(prompt, { ...options, maxTokens: 300, temperature: 0.7 }, cacheKey)
  }

  async generateCustomReply(context: EmailReplyContext, customPrompt: string, options?: AIOptions): Promise<string> {
    const cacheKey = this.generateCacheKey('custom-reply', { ...context, customPrompt })
    const cached = this.cache.get(cacheKey)
    if (cached) return cached

    const prompt = this.buildCustomReplyPrompt(context, customPrompt)
    return this.executeWithRateLimit(prompt, { ...options, maxTokens: 400, temperature: 0.8 }, cacheKey)
  }

  async getAutocompletion(context: AutocompleteContext, options?: AIOptions): Promise<string> {
    // No caching for autocompletion as it's context-sensitive
    const prompt = this.buildAutocompletionPrompt(context)
    return this.executeWithRateLimit(prompt, { ...options, maxTokens: 50, temperature: 0.8 })
  }

  // Rate limiting and execution
  private async executeWithRateLimit(prompt: string, options?: AIOptions, cacheKey?: string): Promise<string> {
    if (!this.rateLimiter.canMakeRequest()) {
      const info = this.rateLimiter.getInfo()
      throw new AIError(
        `Rate limit exceeded. Try again in ${Math.ceil((info.resetTime - Date.now()) / 1000)} seconds`,
        'RATE_LIMIT_EXCEEDED',
        this.name,
      )
    }

    try {
      this.rateLimiter.recordRequest()
      const result = await this.callAI(prompt, options)

      // Cache the result if cache key provided
      if (cacheKey) {
        this.cache.set(cacheKey, result.response, result.usage)
      }

      return result.response
    } catch (error) {
      logger.error(`[${this.name}] AI call failed:`, error)
      throw new AIError(`AI provider ${this.name} failed: ${error.message}`, 'AI_CALL_FAILED', this.name, error)
    }
  }

  // Prompt builders - can be overridden by specific providers
  protected buildSummaryPrompt(context: EmailThreadContext): string {
    const emailsList = context.emails
      .map(
        (email, index) =>
          `Email ${index + 1} (${email.date}):\n` +
          `From: ${email.from.name || email.from.email}\n` +
          `To: ${email.to.map(t => t.name || t.email).join(', ')}\n` +
          `Subject: ${email.subject}\n` +
          `Content: ${email.snippet || email.bodyText?.substring(0, 300) || 'No content'}\n`,
      )
      .join('\n---\n')

    return `Please provide a concise 2-3 sentence summary of this email conversation between ${context.contact.name} and the user:

${emailsList}

Focus on:
- Key topics discussed
- Any decisions made or next steps
- Overall tone and relationship status

Keep it professional and factual.`
  }

  protected buildPositiveReplyPrompt(context: EmailReplyContext): string {
    const originalEmail = context.originalEmail

    return `Write a positive, professional reply to this email:

From: ${originalEmail.from.name || originalEmail.from.email}
Subject: ${originalEmail.subject}
Content: ${originalEmail.snippet || originalEmail.bodyText?.substring(0, 500) || 'No content'}

Context: This is a business email with ${context.contact.name} (${context.contact.company || 'their company'}).

Write a positive, enthusiastic response that:
- Acknowledges their message
- Shows interest and engagement
- Maintains a professional but friendly tone
- Is concise (2-3 paragraphs max)

Do not include subject line or signatures, just the email body.`
  }

  protected buildNegativeReplyPrompt(context: EmailReplyContext): string {
    const originalEmail = context.originalEmail

    return `Write a polite but negative reply to this email:

From: ${originalEmail.from.name || originalEmail.from.email}
Subject: ${originalEmail.subject}
Content: ${originalEmail.snippet || originalEmail.bodyText?.substring(0, 500) || 'No content'}

Context: This is a business email with ${context.contact.name} (${context.contact.company || 'their company'}).

Write a polite, professional response that:
- Thanks them for their message
- Politely declines or explains limitations
- Offers alternatives if appropriate
- Maintains goodwill and leaves the door open for future opportunities
- Is respectful and diplomatic

Do not include subject line or signatures, just the email body.`
  }

  protected buildCustomReplyPrompt(context: EmailReplyContext, customPrompt: string): string {
    const originalEmail = context.originalEmail

    return `Write a professional reply to this email based on the user's specific instructions:

Original Email:
From: ${originalEmail.from.name || originalEmail.from.email}
Subject: ${originalEmail.subject}
Content: ${originalEmail.snippet || originalEmail.bodyText?.substring(0, 500) || 'No content'}

Context: This is a business email with ${context.contact.name} (${context.contact.company || 'their company'}).

User Instructions: ${customPrompt}

Write a professional response that:
- Follows the user's specific instructions
- Maintains appropriate business tone
- Addresses the original email content
- Is well-structured and clear

Do not include subject line or signatures, just the email body.`
  }

  protected buildAutocompletionPrompt(context: AutocompleteContext): string {
    const emailContext = context.emailBeingReplied
      ? `Replying to email from ${context.emailBeingReplied.from.name || context.emailBeingReplied.from.email} about "${context.emailBeingReplied.subject}"`
      : 'Composing new email'

    return `You are helping complete a professional business email. 

Context: ${emailContext}
Contact: ${context.contact.name} (${context.contact.company || 'their company'})

Current text being written:
"${context.partialText}"

Continue this text naturally with 5-15 words that would logically follow. The completion should:
- Match the tone and style
- Be grammatically correct
- Be contextually appropriate for business communication
- Not repeat what's already written

Only provide the completion text, nothing else.`
  }

  // Utility methods
  private generateCacheKey(operation: string, context: any): string {
    const contextStr = JSON.stringify(context)
    // Use TextEncoder to handle UTF-8 characters safely
    const encoder = new TextEncoder()
    const data = encoder.encode(contextStr)

    // Create a simple hash from the encoded data
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash + data[i]) & 0xffffffff
    }

    // Convert to a safe string representation
    const hashStr = Math.abs(hash).toString(36)
    return `${this.name}:${operation}:${hashStr}`
  }

  // Default implementations
  isConfigured(): boolean {
    return !!(this.config.apiKey && this.config.apiKey.length > 0)
  }

  async validateConnection(): Promise<boolean> {
    if (!this.isConfigured()) return false

    try {
      // Simple test call
      await this.callAI('Test connection', { maxTokens: 1, temperature: 0 })
      return true
    } catch {
      return false
    }
  }

  getRateLimitInfo(): RateLimitInfo {
    return this.rateLimiter.getInfo()
  }

  dispose(): void {
    this.cache.clear()
    logger.log(`[${this.name}] Provider disposed`)
  }
}
