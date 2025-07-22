import { useEmailAI } from '@/hooks/useEmailAI' // ✅ RE-ENABLED with optimized hook
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle } from 'lucide-react'
import React from 'react'

/**
 * Props for the AIStatusIndicator component
 */
interface AIStatusIndicatorProps {
  /** Additional CSS classes to apply to the component */
  className?: string
  /** Whether to show the text label alongside the status icon */
  showLabel?: boolean
  /** Visual variant of the indicator - 'default' shows a badge style, 'minimal' shows just icon + text */
  variant?: 'default' | 'minimal'
}

/**
 * A React component that displays the current status of AI email functionality.
 *
 * Features:
 * - Shows three possible states: Configured (ready), Error, or Not Configured
 * - Visual indicators with appropriate colors and icons
 * - Two display variants: default badge style or minimal inline style
 * - Displays the current AI provider name when configured
 * - Real-time status updates based on AI configuration changes
 *
 * @example
 * ```tsx
 * // Default badge style with label
 * <AIStatusIndicator />
 *
 * // Minimal style without label
 * <AIStatusIndicator variant="minimal" showLabel={false} />
 *
 * // Custom styling
 * <AIStatusIndicator className="ml-2" variant="minimal" />
 * ```
 */
export const AIStatusIndicator: React.FC<AIStatusIndicatorProps> = ({
  className,
  showLabel = true,
  variant = 'default',
}) => {
  // ✅ RE-ENABLED: Using optimized useEmailAI hook to get current AI status
  const { isConfigured, initializationError, provider } = useEmailAI()

  /**
   * Determines the appropriate status display based on current AI configuration state
   * @returns Object containing icon component, label text, and styling classes for the current status
   */
  const getStatus = () => {
    // Error state - AI failed to initialize properly
    if (initializationError) {
      return {
        icon: AlertCircle,
        label: `AI Error: ${initializationError.message}`,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
      }
    }

    // Ready state - AI is properly configured and available
    if (isConfigured) {
      return {
        icon: CheckCircle,
        label: `AI Ready (${provider.name})`,
        color: 'text-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
      }
    }

    // Not configured state - AI needs setup or configuration
    return {
      icon: AlertCircle,
      label: 'AI Not Configured',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
    }
  }

  /** Current status information including icon, colors, and label */
  const status = getStatus()
  /** Icon component to display based on current status */
  const Icon = status.icon

  // Minimal variant - Simple inline display with icon and optional text
  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <Icon className={cn('h-3 w-3', status.color)} />
        {showLabel && <span className={cn('text-xs', status.color)}>{status.label}</span>}
      </div>
    )
  }

  // Default variant - Badge-style display with background and border
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-2 py-1 rounded-md border text-xs font-medium',
        status.bgColor,
        status.borderColor,
        status.color,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {showLabel && <span>{status.label}</span>}
    </div>
  )
}
