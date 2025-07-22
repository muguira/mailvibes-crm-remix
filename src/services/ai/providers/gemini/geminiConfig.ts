import { ProviderConfig } from '../base/types'

export interface GeminiConfig extends ProviderConfig {
  model: string
  apiKey: string
  baseUrl?: string
  safetySettings?: {
    harassment: 'BLOCK_NONE' | 'BLOCK_ONLY_HIGH' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_LOW_AND_ABOVE'
    hateSpeech: 'BLOCK_NONE' | 'BLOCK_ONLY_HIGH' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_LOW_AND_ABOVE'
    sexuallyExplicit: 'BLOCK_NONE' | 'BLOCK_ONLY_HIGH' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_LOW_AND_ABOVE'
    dangerousContent: 'BLOCK_NONE' | 'BLOCK_ONLY_HIGH' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_LOW_AND_ABOVE'
  }
}

export const defaultGeminiConfig: Partial<GeminiConfig> = {
  model: 'gemini-2.0-flash',
  timeout: 30000,
  maxRetries: 3,
  safetySettings: {
    harassment: 'BLOCK_NONE',
    hateSpeech: 'BLOCK_NONE',
    sexuallyExplicit: 'BLOCK_NONE',
    dangerousContent: 'BLOCK_NONE',
  },
}

export const geminiModels = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash', 'gemini-pro'] as const

export type GeminiModel = (typeof geminiModels)[number]

// Model-specific configurations
export const modelConfigs: Record<
  GeminiModel,
  {
    maxTokens: number
    contextWindow: number
    costPer1kTokens: number
  }
> = {
  'gemini-1.5-flash': {
    maxTokens: 8192,
    contextWindow: 1000000,
    costPer1kTokens: 0.075, // Example pricing
  },
  'gemini-1.5-pro': {
    maxTokens: 8192,
    contextWindow: 2000000,
    costPer1kTokens: 0.35, // Example pricing
  },
  'gemini-2.0-flash': {
    maxTokens: 8192,
    contextWindow: 2000000,
    costPer1kTokens: 0.075, // Example pricing - similar to flash models
  },
  'gemini-pro': {
    maxTokens: 4096,
    contextWindow: 30720,
    costPer1kTokens: 0.5, // Example pricing
  },
}
