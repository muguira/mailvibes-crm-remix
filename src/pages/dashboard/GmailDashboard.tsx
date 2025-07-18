import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { GmailSyncDashboard } from '@/components/integrations/gmail';
import { useAuth } from '@/components/auth';
import { 
  useGmailAccounts, 
  useGmailMainLoading, 
  useGmailError, 
  useGmailInitializeService,
  useGmailLoadAccounts
} from '@/stores/gmail/selectors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function GmailDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Use granular selectors instead of full useGmail hook for better reliability
  const accounts = useGmailAccounts() || [];
  const loading = useGmailMainLoading();
  const error = useGmailError();
  const initializeService = useGmailInitializeService();
  const loadAccounts = useGmailLoadAccounts();
  
  // Local state for initialization tracking
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  
  // Derived state
  const hasConnectedAccounts = Array.isArray(accounts) && accounts.length > 0;
  
  // Robust initialization function following Integrations.tsx pattern
  const memoizedInitializeAndLoad = useCallback(async () => {
    if (!user?.id) {
      console.log('[GmailDashboard] User not available, skipping initialization');
      return;
    }
    
    console.log('[GmailDashboard] Starting Gmail service initialization...', { userId: user.id });
    setInitError(null);
    
    try {
      // First initialize the service
      console.log('[GmailDashboard] Initializing service...');
      await initializeService(user.id);
      
      // Then load accounts
      console.log('[GmailDashboard] Loading accounts...');
      await loadAccounts();
      
      console.log('[GmailDashboard] Gmail initialization completed successfully');
      setIsInitializing(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[GmailDashboard] Error initializing Gmail:', error);
      setInitError(errorMessage);
      setIsInitializing(false);
    }
  }, [user?.id, initializeService, loadAccounts]);
  
  // Auto-initialize on mount with delay (same as Integrations.tsx)
  useEffect(() => {
    console.log('[GmailDashboard] Component mounted, scheduling initialization...');
    
    // Add a small delay to let the page settle
    const timeoutId = setTimeout(() => {
      memoizedInitializeAndLoad();
    }, 500);

    return () => {
      console.log('[GmailDashboard] Cleanup timeout');
      clearTimeout(timeoutId);
    };
  }, [memoizedInitializeAndLoad]);
  
  // Update initialization state when accounts are found
  useEffect(() => {
    if (hasConnectedAccounts && isInitializing) {
      console.log('[GmailDashboard] Accounts found, stopping initialization loader');
      setIsInitializing(false);
    }
  }, [hasConnectedAccounts, isInitializing]);

  const handleBackToIntegrations = () => {
    navigate('/settings/integrations');
  };

  // Show loading state while service is initializing
  if (loading || isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={handleBackToIntegrations}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Integrations
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Gmail Dashboard</h1>
            <p className="text-gray-600 mt-2">Monitor and analyze your Gmail sync performance</p>
          </div>

                     {/* Loading state */}
           <div className="flex items-center justify-center p-8">
             <div className="text-center space-y-4">
               <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                               <p className="text-gray-600">
                  {loading ? 'Loading Gmail accounts...' : 'Initializing Gmail service...'}
                </p>
                <p className="text-sm text-gray-500">This may take a few seconds</p>
             </div>
           </div>
        </div>
      </div>
    );
  }

  // Show error state if initialization failed
  if (initError || (error && !loading && !isInitializing)) {
    const displayError = initError || error;
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={handleBackToIntegrations}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Integrations
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Gmail Dashboard</h1>
            <p className="text-gray-600 mt-2">Monitor and analyze your Gmail sync performance</p>
          </div>

          {/* Error alert */}
          <Alert className="mb-4" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to initialize Gmail service: {displayError}
            </AlertDescription>
          </Alert>
          
          {/* Retry button */}
          <div className="text-center">
            <Button onClick={() => {
              setInitError(null);
              setIsInitializing(true);
              memoizedInitializeAndLoad();
            }}>
              Retry Initialization
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show no accounts state only after successful initialization
  if (!hasConnectedAccounts && !loading && !isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={handleBackToIntegrations}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Integrations
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Gmail Dashboard</h1>
            <p className="text-gray-600 mt-2">Monitor and analyze your Gmail sync performance</p>
          </div>

          {/* No accounts alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No Gmail accounts connected. Please connect a Gmail account first to view the dashboard.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleBackToIntegrations}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Integrations
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Gmail Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor and analyze your Gmail sync performance</p>
        </div>

        {/* Dashboard Content */}
        <GmailSyncDashboard />
      </div>
    </div>
  );
} 