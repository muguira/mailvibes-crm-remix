import React from 'react'
import { useEmailAI } from '@/hooks/useEmailAI' // ✅ RE-ENABLED with optimized hook
import { Sparkles, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIStatusIndicatorProps {
  className?: string
  showLabel?: boolean
  variant?: 'default' | 'minimal'
}

export const AIStatusIndicator: React.FC<AIStatusIndicatorProps> = ({
  className,
  showLabel = true,
  variant = 'default',
}) => {
  // ✅ RE-ENABLED: Using optimized useEmailAI hook
  const { isConfigured, initializationError, provider } = useEmailAI()

  const getStatus = () => {
    if (initializationError) {
      return {
        icon: AlertCircle,
        label: `AI Error: ${initializationError.message}`,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
      }
    }

    if (isConfigured) {
      return {
        icon: CheckCircle,
        label: `AI Ready (${provider.name})`,
        color: 'text-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
      }
    }

    return {
      icon: AlertCircle,
      label: 'AI Not Configured',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
    }
  }

  const status = getStatus()
  const Icon = status.icon

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <Icon className={cn('h-3 w-3', status.color)} />
        {showLabel && <span className={cn('text-xs', status.color)}>{status.label}</span>}
      </div>
    )
  }

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
