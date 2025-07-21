import React from 'react';
import { useEmailAI } from '@/hooks/useEmailAI';
import { AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export const AIStatusIndicator: React.FC<AIStatusIndicatorProps> = ({
  className,
  showDetails = false
}) => {
  const { 
    isConfigured, 
    provider, 
    initializationError,
    validateConnection
  } = useEmailAI();

  const [connectionStatus, setConnectionStatus] = React.useState<'unknown' | 'checking' | 'connected' | 'failed'>('unknown');

  const checkConnection = React.useCallback(async () => {
    setConnectionStatus('checking');
    try {
      const isConnected = await validateConnection();
      setConnectionStatus(isConnected ? 'connected' : 'failed');
    } catch (error) {
      setConnectionStatus('failed');
    }
  }, [validateConnection]);

  const getStatusIcon = () => {
    if (initializationError) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    
    if (!isConfigured) {
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }

    switch (connectionStatus) {
      case 'checking':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    if (initializationError) {
      return 'AI initialization failed';
    }
    
    if (!isConfigured) {
      return 'AI not configured';
    }

    switch (connectionStatus) {
      case 'checking':
        return 'Checking connection...';
      case 'connected':
        return `AI ready (${provider.name})`;
      case 'failed':
        return 'Connection failed';
      default:
        return `AI configured (${provider.name})`;
    }
  };

  const getStatusColor = () => {
    if (initializationError) return 'text-red-600';
    if (!isConfigured) return 'text-yellow-600';
    
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'checking':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  if (!showDetails) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {getStatusIcon()}
        {connectionStatus === 'unknown' && isConfigured && (
          <button 
            onClick={checkConnection}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Test
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <span className={cn("text-sm font-medium", getStatusColor())}>
          {getStatusText()}
        </span>
        {connectionStatus === 'unknown' && isConfigured && (
          <button 
            onClick={checkConnection}
            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
          >
            Test Connection
          </button>
        )}
      </div>

      {showDetails && (
        <div className="text-xs text-gray-500 space-y-1">
          <div>Provider: {provider.name}</div>
          <div>Configured: {isConfigured ? 'Yes' : 'No'}</div>
          {provider.supportedModels.length > 0 && (
            <div>Models: {provider.supportedModels.join(', ')}</div>
          )}
          {initializationError && (
            <div className="text-red-600 mt-1">
              Error: {initializationError.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 