// Main exports for the AI system
export type { AIProvider } from './providers/base/AIProvider'
export { BaseAIProvider } from './providers/base/AIProvider'
export * from './providers/base/types'

// Specific providers
export { GeminiProvider } from './providers/gemini/GeminiProvider'
export type { GeminiConfig } from './providers/gemini/geminiConfig'
export { defaultGeminiConfig, geminiModels } from './providers/gemini/geminiConfig'

// Factory and repository
export { AIProviderFactory } from './factories/AIProviderFactory'
export { EmailAIRepository } from './repositories/EmailAIRepository'

// Context builder
export { EmailContextBuilder } from './context/EmailContextBuilder'

// Re-export commonly used types
export type {
  ContactInfo,
  EmailThreadContext,
  EmailReplyContext,
  AutocompleteContext,
  AIResponse,
  AIError,
  EmailAIOptions,
} from './providers/base/types'
