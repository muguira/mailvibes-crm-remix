import React from 'react';
import { Button } from '@/components/ui/button';
import { AIProviderFactory } from '@/services/ai/factories/AIProviderFactory';

export const AIDebugPanel: React.FC = () => {
  const handleDebugInfo = () => {
    console.log('=== AI DEBUG INFO ===');
    console.log('VITE_GEMINI_API_KEY:', import.meta.env.VITE_GEMINI_API_KEY ? 'SET' : 'NOT SET');
    console.log('VITE_GOOGLE_API_KEY:', import.meta.env.VITE_GOOGLE_API_KEY ? 'SET' : 'NOT SET');
    console.log('VITE_AI_MODEL:', import.meta.env.VITE_AI_MODEL);
    console.log('VITE_AI_PROVIDER:', import.meta.env.VITE_AI_PROVIDER);
    
    try {
      const stats = AIProviderFactory.getStats();
      console.log('Factory Stats:', stats);
      
      const availableProviders = AIProviderFactory.getAvailableProviders();
      console.log('Available Providers:', availableProviders);
      
      const configuredProviders = AIProviderFactory.getConfiguredProviders();
      console.log('Configured Providers:', configuredProviders);
      
    } catch (error) {
      console.error('Error getting AI factory info:', error);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-2">AI Debug Panel</h3>
      <Button onClick={handleDebugInfo} variant="outline">
        Log AI Debug Info to Console
      </Button>
      <div className="mt-2 text-xs text-gray-600">
        Check browser console after clicking the button
      </div>
    </div>
  );
}; 