import React, { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, ArrowRight, X, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutocompleteSuggestion {
  id: string;
  text: string;
  confidence: number;
  type: 'completion' | 'continuation' | 'sentence_end';
}

interface AIAutocompleteSuggestionProps {
  suggestions: AutocompleteSuggestion[];
  activeSuggestionIndex: number;
  isLoadingSuggestions: boolean;
  showSuggestions: boolean;
  onAcceptSuggestion: (index?: number) => void;
  onRejectSuggestions: () => void;
  onNavigateSuggestions: (direction: 'up' | 'down') => void;
  className?: string;
}

const getSuggestionTypeInfo = (type: AutocompleteSuggestion['type']) => {
  switch (type) {
    case 'completion':
      return { label: 'Complete', color: 'bg-blue-100 text-blue-700', icon: ArrowRight };
    case 'continuation':
      return { label: 'Continue', color: 'bg-green-100 text-green-700', icon: ArrowRight };
    case 'sentence_end':
      return { label: 'Finish', color: 'bg-purple-100 text-purple-700', icon: ArrowRight };
    default:
      return { label: 'Suggest', color: 'bg-gray-100 text-gray-700', icon: ArrowRight };
  }
};

export const AIAutocompleteSuggestion: React.FC<AIAutocompleteSuggestionProps> = ({
  suggestions,
  activeSuggestionIndex,
  isLoadingSuggestions,
  showSuggestions,
  onAcceptSuggestion,
  onRejectSuggestions,
  onNavigateSuggestions,
  className
}) => {
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!showSuggestions || suggestions.length === 0) return;

      switch (event.key) {
        case 'Tab':
        case 'Enter':
          event.preventDefault();
          onAcceptSuggestion();
          break;
        case 'Escape':
          event.preventDefault();
          onRejectSuggestions();
          break;
        case 'ArrowUp':
          event.preventDefault();
          onNavigateSuggestions('up');
          break;
        case 'ArrowDown':
          event.preventDefault();
          onNavigateSuggestions('down');
          break;
      }
    };

    if (showSuggestions) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showSuggestions, suggestions.length, onAcceptSuggestion, onRejectSuggestions, onNavigateSuggestions]);

  if (!showSuggestions && !isLoadingSuggestions) {
    return null;
  }

  return (
    <div className={cn(
      "absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-80 max-w-md",
      "animate-in slide-in-from-top-2 duration-200",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-900">
            AI Suggestions
          </span>
          {isLoadingSuggestions && (
            <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRejectSuggestions}
          className="h-6 w-6 p-0 hover:bg-gray-200"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      {/* Content */}
      <div className="max-h-40 overflow-y-auto">
        {isLoadingSuggestions ? (
          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Generating suggestions...</span>
            </div>
          </div>
        ) : suggestions.length > 0 ? (
          <div className="p-2 space-y-1">
            {suggestions.map((suggestion, index) => {
              const typeInfo = getSuggestionTypeInfo(suggestion.type);
              const TypeIcon = typeInfo.icon;
              const isActive = index === activeSuggestionIndex;

              return (
                <div
                  key={suggestion.id}
                  className={cn(
                    "relative p-3 rounded-md border cursor-pointer transition-all duration-150",
                    "hover:bg-blue-50 hover:border-blue-200",
                    isActive && "bg-blue-50 border-blue-300 shadow-sm"
                  )}
                  onClick={() => onAcceptSuggestion(index)}
                >
                  {/* Suggestion header */}
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className={cn("text-xs", typeInfo.color)}>
                      <TypeIcon className="w-3 h-3 mr-1" />
                      {typeInfo.label}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {/* Confidence indicator */}
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                        <span className="text-xs text-gray-500">
                          {Math.round(suggestion.confidence * 100)}%
                        </span>
                      </div>
                      {/* Active indicator */}
                      {isActive && (
                        <div className="flex items-center gap-1 text-blue-600">
                          <span className="text-xs font-medium">Press Tab</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Suggestion text */}
                  <div className="text-sm text-gray-800 leading-relaxed line-clamp-2">
                    {suggestion.text}
                  </div>

                  {/* Selection indicator */}
                  {isActive && (
                    <div className="absolute inset-0 border-2 border-blue-400 rounded-md pointer-events-none opacity-50" />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500 text-sm">
            No suggestions available
          </div>
        )}
      </div>

      {/* Footer with keyboard hints */}
      {suggestions.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 rounded-b-lg">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-xs">Tab</kbd>
                Accept
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-xs">Esc</kbd>
                Dismiss
              </span>
            </div>
            {suggestions.length > 1 && (
              <div className="flex items-center gap-1">
                <ChevronUp className="w-3 h-3" />
                <ChevronDown className="w-3 h-3" />
                <span>Navigate</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 