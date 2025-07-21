import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'
import { BaseAIProvider } from '../base/AIProvider'
import { AIOptions, AIError } from '../base/types'
import { GeminiConfig, defaultGeminiConfig, geminiModels, modelConfigs } from './geminiConfig'
import { logger } from '@/utils/logger'

export class GeminiProvider extends BaseAIProvider {
  readonly name = 'gemini'
  readonly supportedModels = [...geminiModels]

  private geminiConfig: GeminiConfig
  private googleProvider: any

  constructor(config: Partial<GeminiConfig>) {
    // Merge with defaults
    const fullConfig: GeminiConfig = {
      ...defaultGeminiConfig,
      ...config,
    } as GeminiConfig

    super(fullConfig, 10) // 10 requests per minute default
    this.geminiConfig = fullConfig

    if (!fullConfig.apiKey) {
      throw new AIError('Gemini API key is required', 'MISSING_API_KEY', 'gemini')
    }

    this.initializeModel()
  }

  private initializeModel(): void {
    try {
      if (!this.geminiConfig.apiKey) {
        throw new Error('API key is required for Gemini provider')
      }

      // Create Google provider instance with API key
      this.googleProvider = createGoogleGenerativeAI({
        apiKey: this.geminiConfig.apiKey,
      })

      logger.log(`[Gemini] Provider initialized for model: ${this.geminiConfig.model}`)
    } catch (error) {
      logger.error('[Gemini] Failed to initialize:', error)
      throw new AIError('Failed to initialize Gemini provider', 'INITIALIZATION_FAILED', 'gemini', error)
    }
  }

  protected async callAI(
    prompt: string,
    options?: AIOptions,
  ): Promise<{
    response: string
    usage?: any
  }> {
    if (!this.googleProvider) {
      throw new AIError('Gemini provider not initialized', 'MODEL_NOT_INITIALIZED', 'gemini')
    }

    const modelConfig = modelConfigs[this.geminiConfig.model as keyof typeof modelConfigs]

    try {
      logger.log(`[Gemini] Making AI call with model: ${this.geminiConfig.model}`)

      const result = await generateText({
        model: this.googleProvider(this.geminiConfig.model),
        prompt,
        maxTokens: Math.min(options?.maxTokens || 150, modelConfig?.maxTokens || 4096),
        temperature: options?.temperature || 0.7,
        topP: 0.95,
        topK: 40,
        // Add request timeout
        abortSignal: AbortSignal.timeout(this.geminiConfig.timeout || 30000),
      })

      logger.log(`[Gemini] AI call successful`, {
        usage: result.usage,
        finishReason: result.finishReason,
        model: this.geminiConfig.model,
      })

      return {
        response: result.text,
        usage: {
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
        },
      }
    } catch (error: any) {
      logger.error('[Gemini] AI call failed:', error)

      // Handle specific Gemini/Google API errors
      if (error.name === 'AbortError') {
        throw new AIError('Request timeout', 'TIMEOUT', 'gemini', error)
      }

      if (error.status === 401) {
        throw new AIError('Invalid API key', 'INVALID_API_KEY', 'gemini', error)
      }

      if (error.status === 429) {
        throw new AIError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 'gemini', error)
      }

      if (error.status === 400) {
        throw new AIError('Invalid request parameters', 'INVALID_REQUEST', 'gemini', error)
      }

      if (error.status >= 500) {
        throw new AIError('Google API server error', 'SERVER_ERROR', 'gemini', error)
      }

      throw new AIError(`Gemini API call failed: ${error.message}`, 'API_CALL_FAILED', 'gemini', error)
    }
  }

  // Override validation with Gemini-specific logic
  async validateConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      logger.warn('[Gemini] Provider not configured')
      return false
    }

    try {
      logger.log('[Gemini] Validating connection...')

      // Simple test call with minimal tokens
      const result = await this.callAI('Hello', {
        maxTokens: 5,
        temperature: 0,
      })

      const isValid = result.response.length > 0
      logger.log(`[Gemini] Connection validation: ${isValid ? 'SUCCESS' : 'FAILED'}`)

      return isValid
    } catch (error) {
      logger.error('[Gemini] Connection validation failed:', error)
      return false
    }
  }

  // Override configuration check
  isConfigured(): boolean {
    const hasApiKey = !!(this.geminiConfig.apiKey && this.geminiConfig.apiKey.length > 0)
    const hasValidModel = this.supportedModels.includes(this.geminiConfig.model as any)

    if (!hasApiKey) {
      logger.warn('[Gemini] Missing API key')
    }
    if (!hasValidModel) {
      logger.warn(`[Gemini] Invalid model: ${this.geminiConfig.model}`)
    }

    return hasApiKey && hasValidModel
  }

  // Gemini-specific optimizations for email use cases
  protected buildSummaryPrompt(context: any): string {
    // Use Gemini's strength in understanding context and conversation flows
    const basePrompt = super.buildSummaryPrompt(context)

    return `${basePrompt}

Please structure your response in this format:
**Summary:** [2-3 sentences covering the main points]
**Key Topics:** [Brief list of topics discussed]
**Next Steps:** [Any action items or follow-ups mentioned]

Keep it concise and professional.`
  }

  protected buildAutocompletionPrompt(context: any): string {
    // Optimize for Gemini's text completion capabilities
    const basePrompt = super.buildAutocompletionPrompt(context)

    return `${basePrompt}

Important: Respond with ONLY the completion text. Do not include explanations, quotes, or additional formatting.`
  }

  // Get current model information
  getModelInfo() {
    return {
      name: this.geminiConfig.model,
      config: modelConfigs[this.geminiConfig.model as keyof typeof modelConfigs],
      provider: 'gemini',
    }
  }

  // Update model dynamically
  updateModel(model: string): void {
    if (!this.supportedModels.includes(model as any)) {
      throw new AIError(`Unsupported model: ${model}`, 'UNSUPPORTED_MODEL', 'gemini')
    }

    this.geminiConfig.model = model
    this.initializeModel()
    logger.log(`[Gemini] Model updated to: ${model}`)
  }

  // Get usage statistics
  getUsageStats() {
    const rateLimitInfo = this.getRateLimitInfo()
    const cacheInfo = {
      size: this.cache.size(),
      // Add more cache stats if needed
    }

    return {
      rateLimitInfo,
      cacheInfo,
      model: this.getModelInfo(),
      isConfigured: this.isConfigured(),
    }
  }

  dispose(): void {
    super.dispose()
    this.googleProvider = null
    logger.log('[Gemini] Provider disposed')
  }
}
