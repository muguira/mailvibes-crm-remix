import { useState, useEffect, useCallback, useRef } from 'react'
import { useEmailAI } from './useEmailAI'
import { TimelineActivity } from './use-timeline-activities-v2'
import { ContactInfo } from '@/services/ai'
import { useDebounce } from './use-debounce'
import { logger } from '@/utils/logger'

interface UseAIAutocompletionOptions {
  originalEmail?: TimelineActivity
  conversationHistory?: TimelineActivity[]
  contactInfo?: ContactInfo
  debounceMs?: number
  minTextLength?: number
  enabled?: boolean
}

interface AutocompleteSuggestion {
  id: string
  text: string
  confidence: number
  type: 'completion' | 'continuation' | 'sentence_end'
}

export const useAIAutocompletion = (options: UseAIAutocompletionOptions = {}) => {
  const {
    originalEmail,
    conversationHistory = [],
    contactInfo,
    debounceMs = 2000, // Wait 2 seconds after user stops typing
    minTextLength = 10, // Don't trigger for very short text
    enabled = true,
  } = options

  const [currentText, setCurrentText] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Debounce the text input to avoid too many API calls
  const debouncedText = useDebounce(currentText, debounceMs)
  const debouncedCursorPosition = useDebounce(cursorPosition, debounceMs)

  // Keep track of the last text we made suggestions for to avoid duplicates
  const lastSuggestedTextRef = useRef<string>('')

  const { getAutocompletion, isConfigured } = useEmailAI({
    showToasts: false, // Don't show toasts for autocomplete, it would be annoying
  })

  // Generate suggestions when debounced text changes
  useEffect(() => {
    if (!enabled || !isConfigured || !contactInfo || !originalEmail) {
      return
    }

    // Don't generate suggestions for very short text
    if (debouncedText.length < minTextLength) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    // Don't regenerate suggestions for the same text
    if (debouncedText === lastSuggestedTextRef.current) {
      return
    }

    // Get suggestions from AI
    generateSuggestions(debouncedText, debouncedCursorPosition)
  }, [debouncedText, debouncedCursorPosition, enabled, isConfigured, contactInfo, originalEmail, minTextLength])

  const generateSuggestions = useCallback(
    async (text: string, cursorPos: number) => {
      if (!contactInfo || !originalEmail) return

      setIsLoadingSuggestions(true)
      setSuggestions([])

      try {
        logger.log('[AIAutocompletion] Generating suggestions for:', {
          textLength: text.length,
          cursorPosition: cursorPos,
          textPreview: text.substring(Math.max(0, cursorPos - 20), cursorPos + 20),
          originalEmailSubject: originalEmail.subject,
        })

        const result = await getAutocompletion(text, cursorPos, originalEmail, conversationHistory, contactInfo)

        if (result) {
          // Process the AI response into suggestions
          const aiSuggestion = result.trim()

          if (aiSuggestion && aiSuggestion.length > 0) {
            // Create multiple suggestions by breaking the AI response
            const suggestions: AutocompleteSuggestion[] = []

            // Primary suggestion: the full AI response
            suggestions.push({
              id: `ai-suggestion-${Date.now()}-1`,
              text: aiSuggestion,
              confidence: 0.9,
              type: 'completion',
            })

            // If the suggestion contains multiple sentences, offer shorter versions
            const sentences = aiSuggestion.split(/[.!?]+/).filter(s => s.trim())
            if (sentences.length > 1) {
              suggestions.push({
                id: `ai-suggestion-${Date.now()}-2`,
                text: sentences[0].trim() + '.',
                confidence: 0.7,
                type: 'sentence_end',
              })
            }

            setSuggestions(suggestions)
            setShowSuggestions(true)
            setActiveSuggestionIndex(0)
            lastSuggestedTextRef.current = text

            logger.log('[AIAutocompletion] Generated suggestions:', {
              count: suggestions.length,
              primarySuggestion: suggestions[0]?.text.substring(0, 50) + '...',
            })
          }
        }
      } catch (error) {
        logger.error('[AIAutocompletion] Error generating suggestions:', error)
        setSuggestions([])
        setShowSuggestions(false)
      } finally {
        setIsLoadingSuggestions(false)
      }
    },
    [getAutocompletion, contactInfo, originalEmail, conversationHistory],
  )

  // Update text and cursor position
  const updateContext = useCallback((text: string, cursorPos: number) => {
    setCurrentText(text)
    setCursorPosition(cursorPos)
  }, [])

  // Accept a suggestion
  const acceptSuggestion = useCallback(
    (suggestionIndex: number = activeSuggestionIndex) => {
      if (suggestionIndex < 0 || suggestionIndex >= suggestions.length) {
        return null
      }

      const suggestion = suggestions[suggestionIndex]
      logger.log('[AIAutocompletion] Accepting suggestion:', {
        index: suggestionIndex,
        text: suggestion.text.substring(0, 50) + '...',
        type: suggestion.type,
      })

      // Hide suggestions after accepting
      setShowSuggestions(false)
      setSuggestions([])
      setActiveSuggestionIndex(-1)

      return suggestion
    },
    [suggestions, activeSuggestionIndex],
  )

  // Reject suggestions
  const rejectSuggestions = useCallback(() => {
    setShowSuggestions(false)
    setSuggestions([])
    setActiveSuggestionIndex(-1)
    lastSuggestedTextRef.current = currentText // Remember we rejected this text
  }, [currentText])

  // Navigate suggestions with keyboard
  const navigateSuggestions = useCallback(
    (direction: 'up' | 'down') => {
      if (suggestions.length === 0) return

      setActiveSuggestionIndex(prevIndex => {
        if (direction === 'down') {
          return prevIndex < suggestions.length - 1 ? prevIndex + 1 : 0
        } else {
          return prevIndex > 0 ? prevIndex - 1 : suggestions.length - 1
        }
      })
    },
    [suggestions.length],
  )

  // Reset state
  const reset = useCallback(() => {
    setSuggestions([])
    setShowSuggestions(false)
    setActiveSuggestionIndex(-1)
    setIsLoadingSuggestions(false)
    lastSuggestedTextRef.current = ''
  }, [])

  return {
    // State
    suggestions,
    isLoadingSuggestions,
    showSuggestions,
    activeSuggestionIndex,
    isEnabled: enabled && isConfigured,

    // Actions
    updateContext,
    acceptSuggestion,
    rejectSuggestions,
    navigateSuggestions,
    reset,

    // Utils
    hasSuggestions: suggestions.length > 0,
    activeSuggestion: activeSuggestionIndex >= 0 ? suggestions[activeSuggestionIndex] : null,
  }
}
