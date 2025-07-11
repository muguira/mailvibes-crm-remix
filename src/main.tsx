import React from 'react';
import ReactDOM from 'react-dom/client';
import { startSyncWorker } from '@/workers/emailSyncWorker';
import App from './App';
import './index.css';
import './services/google/tokenDiagnostics';

// Start the email sync worker
startSyncWorker({
  syncIntervalMs: 1 * 60 * 1000, // 1 minute for faster email sync
  maxConcurrentSyncs: 3,
  retryAttempts: 3,
  retryDelayMs: 30 * 1000, // 30 seconds
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
