import { AutocompleteSuggestion } from '@/types/ai'
import { ArrowRight } from 'lucide-react'

/**
 * Gets visual styling information for different suggestion types
 * @param type - The type of suggestion
 * @returns Object containing label, color classes, and icon component for the suggestion type
 */
export const getSuggestionTypeInfo = (type: AutocompleteSuggestion['type']) => {
  switch (type) {
    case 'completion':
      return { label: 'Complete', color: 'bg-blue-100 text-blue-700', icon: ArrowRight }
    case 'continuation':
      return { label: 'Continue', color: 'bg-green-100 text-green-700', icon: ArrowRight }
    case 'sentence_end':
      return { label: 'Finish', color: 'bg-purple-100 text-purple-700', icon: ArrowRight }
    default:
      return { label: 'Suggest', color: 'bg-gray-100 text-gray-700', icon: ArrowRight }
  }
}
