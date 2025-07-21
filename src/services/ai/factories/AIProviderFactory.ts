import { AIProvider } from '../providers/base/AIProvider'
import { AIError } from '../providers/base/types'
import { GeminiProvider } from '../providers/gemini/GeminiProvider'
import { GeminiConfig } from '../providers/gemini/geminiConfig'
import { logger } from '@/utils/logger'

// Type for provider factory functions
type ProviderFactory = () => AIProvider

// Configuration interface for all providers
interface ProviderConfigs {
  gemini: Partial<GeminiConfig>
  // Future providers can be added here
  // openai: Partial<OpenAIConfig>;
  // anthropic: Partial<AnthropicConfig>;
}

export class AIProviderFactory {
  private static providers: Map<string, ProviderFactory> = new Map()
  private static configs: Partial<ProviderConfigs> = {}
  private static initialized = false

  /**
   * Initialize the factory with environment configurations
   */
  static initialize(): void {
    if (this.initialized) return

    // Load configurations from environment variables
    this.configs = {
      gemini: {
        apiKey: import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_API_KEY,
        model: import.meta.env.VITE_AI_MODEL || 'gemini-1.5-flash',
        timeout: 30000,
        maxRetries: 3,
      },
      // Future provider configs...
    }

    // Register available providers
    this.registerProviders()
    this.initialized = true

    logger.log('[AIProviderFactory] Initialized with providers:', this.getAvailableProviders())
  }

  /**
   * Register all available providers
   */
  private static registerProviders(): void {
    // Register Gemini provider
    this.register('gemini', () => {
      const config = this.configs.gemini
      if (!config?.apiKey) {
        throw new AIError(
          'Gemini API key not found. Please set VITE_GEMINI_API_KEY environment variable.',
          'MISSING_API_KEY',
          'gemini',
        )
      }
      return new GeminiProvider(config)
    })

    // Future providers can be registered here
    // this.register('openai', () => new OpenAIProvider(this.configs.openai));
    // this.register('anthropic', () => new AnthropicProvider(this.configs.anthropic));
  }

  /**
   * Register a new provider factory
   */
  static register(name: string, factory: ProviderFactory): void {
    this.providers.set(name, factory)
    logger.log(`[AIProviderFactory] Registered provider: ${name}`)
  }

  /**
   * Create a provider instance
   */
  static create(providerName?: string): AIProvider {
    if (!this.initialized) {
      this.initialize()
    }

    const provider = providerName || this.getDefaultProvider()

    const factory = this.providers.get(provider)
    if (!factory) {
      const available = this.getAvailableProviders()
      throw new AIError(
        `AI Provider '${provider}' not found. Available providers: ${available.join(', ')}`,
        'PROVIDER_NOT_FOUND',
        provider,
      )
    }

    try {
      const instance = factory()
      logger.log(`[AIProviderFactory] Created provider instance: ${provider}`)
      return instance
    } catch (error) {
      logger.error(`[AIProviderFactory] Failed to create provider ${provider}:`, error)
      throw new AIError(
        `Failed to create AI provider '${provider}': ${error.message}`,
        'PROVIDER_CREATION_FAILED',
        provider,
        error,
      )
    }
  }

  /**
   * Get all available provider names
   */
  static getAvailableProviders(): string[] {
    if (!this.initialized) {
      this.initialize()
    }
    return Array.from(this.providers.keys())
  }

  /**
   * Get configured providers (those with valid configuration)
   */
  static getConfiguredProviders(): string[] {
    const available = this.getAvailableProviders()
    return available.filter(name => this.isProviderConfigured(name))
  }

  /**
   * Check if a provider is properly configured
   */
  static isProviderConfigured(providerName: string): boolean {
    try {
      if (!this.providers.has(providerName)) return false

      // Try to create the provider to check configuration
      const provider = this.create(providerName)
      const isConfigured = provider.isConfigured()
      provider.dispose() // Clean up test instance

      return isConfigured
    } catch {
      return false
    }
  }

  /**
   * Get the default provider based on environment or first available
   */
  static getDefaultProvider(): string {
    const envProvider = import.meta.env.VITE_AI_PROVIDER

    if (envProvider && this.providers.has(envProvider)) {
      return envProvider
    }

    // Try to find first configured provider
    const configured = this.getConfiguredProviders()
    if (configured.length > 0) {
      return configured[0]
    }

    // Fallback to first available
    const available = this.getAvailableProviders()
    if (available.length > 0) {
      return available[0]
    }

    throw new AIError('No AI providers available. Please configure at least one provider.', 'NO_PROVIDERS_AVAILABLE')
  }

  /**
   * Update configuration for a specific provider
   */
  static updateConfig<T extends keyof ProviderConfigs>(providerName: T, config: Partial<ProviderConfigs[T]>): void {
    this.configs[providerName] = {
      ...this.configs[providerName],
      ...config,
    }

    logger.log(`[AIProviderFactory] Updated config for provider: ${providerName}`)
  }

  /**
   * Get provider configuration
   */
  static getConfig<T extends keyof ProviderConfigs>(providerName: T): Partial<ProviderConfigs[T]> {
    return this.configs[providerName] || {}
  }

  /**
   * Validate all provider configurations
   */
  static async validateProviders(): Promise<
    {
      provider: string
      configured: boolean
      connected: boolean
      error?: string
    }[]
  > {
    const providers = this.getAvailableProviders()
    const results = []

    for (const name of providers) {
      try {
        const provider = this.create(name)
        const configured = provider.isConfigured()
        let connected = false
        let error: string | undefined

        if (configured) {
          try {
            connected = await provider.validateConnection()
          } catch (err) {
            error = err instanceof Error ? err.message : 'Unknown error'
          }
        } else {
          error = 'Provider not configured'
        }

        provider.dispose()

        results.push({
          provider: name,
          configured,
          connected,
          error,
        })
      } catch (err) {
        results.push({
          provider: name,
          configured: false,
          connected: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    return results
  }

  /**
   * Get factory statistics
   */
  static getStats() {
    return {
      totalProviders: this.getAvailableProviders().length,
      configuredProviders: this.getConfiguredProviders().length,
      defaultProvider: this.getDefaultProvider(),
      availableProviders: this.getAvailableProviders(),
      initialized: this.initialized,
    }
  }

  /**
   * Reset factory (useful for testing)
   */
  static reset(): void {
    this.providers.clear()
    this.configs = {}
    this.initialized = false
    logger.log('[AIProviderFactory] Reset factory')
  }
}

// Auto-initialize when module is loaded
AIProviderFactory.initialize()
