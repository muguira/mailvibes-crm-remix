export interface ContactInfo {
  id: string
  name: string
  email: string
  company?: string
  phone?: string
}

export interface EmailThreadContext {
  emails: Array<{
    id: string
    subject: string
    from: { name?: string; email: string }
    to: Array<{ name?: string; email: string }>
    date: string
    bodyText?: string
    bodyHtml?: string
    snippet?: string
  }>
  contact: ContactInfo
  threadId?: string
  totalEmailsCount: number
}

export interface EmailReplyContext {
  originalEmail: {
    id: string
    subject: string
    from: { name?: string; email: string }
    to: Array<{ name?: string; email: string }>
    date: string
    bodyText?: string
    bodyHtml?: string
    snippet?: string
  }
  contact: ContactInfo
  conversationHistory: Array<{
    id: string
    subject: string
    from: { name?: string; email: string }
    date: string
    snippet?: string
  }>
  replyType: 'positive' | 'negative' | 'custom'
}

export interface AutocompleteContext {
  partialText: string
  cursorPosition: number
  emailBeingReplied?: {
    subject: string
    from: { name?: string; email: string }
    snippet?: string
  }
  conversationHistory: Array<{
    subject: string
    from: { name?: string; email: string }
    snippet?: string
  }>
  contact: ContactInfo
}

export interface AIOptions {
  maxTokens?: number
  temperature?: number
  model?: string
  timeout?: number
}

export interface AIResponse<T> {
  data: T
  fromCache: boolean
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  model?: string
  provider: string
}

export interface CachedResponse {
  response: string
  timestamp: number
  expiresAt: number
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface RateLimitInfo {
  requestsRemaining: number
  resetTime: number
  maxRequests: number
}

export class AIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public provider?: string,
    public originalError?: Error,
  ) {
    super(message)
    this.name = 'AIError'
  }
}

export interface ProviderConfig {
  apiKey: string
  model?: string
  baseUrl?: string
  timeout?: number
  maxRetries?: number
}

export interface EmailAIOptions {
  cacheEnabled?: boolean
  cacheTTL?: number
  rateLimitEnabled?: boolean
  maxRequestsPerMinute?: number
  defaultProvider?: string
}
