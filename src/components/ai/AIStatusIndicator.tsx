import React from 'react';
// import { useEmailAI } from '@/hooks/useEmailAI'; // ✅ DISABLED for performance testing
import { Sparkles, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIStatusIndicatorProps {
  className?: string;
  showLabel?: boolean;
  variant?: 'default' | 'minimal';
}

export const AIStatusIndicator: React.FC<AIStatusIndicatorProps> = ({
  className,
  showLabel = true,
  variant = 'default'
}) => {
  // ✅ DISABLED: Temporarily remove useEmailAI to eliminate performance bottleneck
  // const {
  //   isLoading,
  //   isConfigured,
  //   initializationError,
  //   provider
  // } = useEmailAI();

  // Mock disabled state
  const isLoading = false;
  const isConfigured = false;
  const initializationError = { message: 'AI temporarily disabled for performance testing' };
  const provider = { name: 'disabled' };

  const getStatus = () => {
    if (isLoading) {
      return {
        icon: Loader2,
        label: 'Initializing AI...',
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        animate: 'animate-spin'
      };
    }

    if (initializationError) {
      return {
        icon: AlertCircle,
        label: `AI Disabled: ${initializationError.message}`,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    }

    if (isConfigured) {
      return {
        icon: CheckCircle,
        label: `AI Ready (${provider.name})`,
        color: 'text-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    }

    return {
      icon: AlertCircle,
      label: 'AI Not Configured',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    };
  };

  const status = getStatus();
  const Icon = status.icon;

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <Icon 
          className={cn('h-3 w-3', status.color, status.animate)} 
        />
        {showLabel && (
          <span className={cn('text-xs', status.color)}>
            {status.label}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      'inline-flex items-center gap-2 px-2 py-1 rounded-md border text-xs font-medium',
      status.bgColor,
      status.borderColor,
      status.color,
      className
    )}>
      <Icon className={cn('h-3 w-3', status.animate)} />
      {showLabel && <span>{status.label}</span>}
    </div>
  );
}; 