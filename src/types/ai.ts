/**
 * Represents an AI-generated autocompletion suggestion
 */
export interface AutocompleteSuggestion {
  /** Unique identifier for the suggestion */
  id: string
  /** The suggested text content */
  text: string
  /** Confidence score between 0 and 1 indicating AI's certainty */
  confidence: number
  /** Type of suggestion that determines its visual styling and behavior */
  type: 'completion' | 'continuation' | 'sentence_end'
}

/**
 * Props for the AIAutocompleteSuggestion component
 */
export interface AIAutocompleteSuggestionProps {
  /** Array of AI-generated suggestions to display */
  suggestions: AutocompleteSuggestion[]
  /** Index of the currently active/selected suggestion */
  activeSuggestionIndex: number
  /** Whether suggestions are currently being loaded from AI */
  isLoadingSuggestions: boolean
  /** Whether to show the suggestions popup */
  showSuggestions: boolean
  /** Callback fired when user accepts a suggestion. If no index provided, uses activeSuggestionIndex */
  onAcceptSuggestion: (index?: number) => void
  /** Callback fired when user dismisses/rejects all suggestions */
  onRejectSuggestions: () => void
  /** Callback fired when user navigates between suggestions using arrow keys */
  onNavigateSuggestions: (direction: 'up' | 'down') => void
  /** Additional CSS classes to apply to the component */
  className?: string
}
