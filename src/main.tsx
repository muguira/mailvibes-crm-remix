import React from 'react';
import ReactDOM from 'react-dom/client';
import { enableMapSet } from 'immer';
import { startSyncWorker, stopSyncWorker } from '@/workers/emailSyncWorker';
import App from './App';
import './index.css';
import './services/google/tokenDiagnostics';
import './utils/debug-emails'; // Make debug function available globally
import './utils/timelineDebug'; // Make timeline debug functions available globally

// Enable Immer MapSet plugin for Set/Map support in Zustand store
enableMapSet();

/**
 * Check if the current route should have email sync enabled
 * Email sync is only needed for contact profile and stream view pages
 */
function shouldEnableEmailSync(): boolean {
  const path = window.location.pathname;
  
  // Enable email sync only for these routes:
  const emailSyncRoutes = [
    '/stream-view',     // Contact stream view pages
    '/contact-profile', // Contact profile pages
  ];
  
  // Disable email sync for these routes:
  const noEmailSyncRoutes = [
    '/leads',           // Leads grid page - no email functionality
    '/dashboard',       // Dashboard - no email display
    '/import',          // Import pages - no email functionality
    '/gmail-import',    // Gmail import - handled separately
    '/settings',        // Settings pages
    '/deleted-contacts' // Deleted contacts view
  ];
  
  // Check if current path matches routes that need email sync
  const needsEmailSync = emailSyncRoutes.some(route => path.startsWith(route));
  
  // Check if current path matches routes that don't need email sync
  const shouldSkipEmailSync = noEmailSyncRoutes.some(route => path.startsWith(route));
  
  return needsEmailSync && !shouldSkipEmailSync;
}

/**
 * Start email sync worker with intelligent route detection
 */
function initializeEmailSync() {
  if (shouldEnableEmailSync()) {
    console.log('[EmailSync] Starting worker for route:', window.location.pathname);
    startSyncWorker({
      syncIntervalMs: 2 * 60 * 1000, // 2 minutes - optimized for contact profile and stream view
      maxConcurrentSyncs: 1,          // Reduced concurrency to prevent overload
      retryAttempts: 2,               // Fewer retries to reduce noise
      retryDelayMs: 60 * 1000,        // 1 minute between retries
    });
  } else {
    console.log('[EmailSync] Skipping worker for route:', window.location.pathname);
  }
}

// Initialize email sync based on current route
initializeEmailSync();

// Monitor route changes and start/stop email sync accordingly
let currentPath = window.location.pathname;
setInterval(() => {
  const newPath = window.location.pathname;
  if (newPath !== currentPath) {
    console.log('[EmailSync] Route changed from', currentPath, 'to', newPath);
    currentPath = newPath;
    
    if (shouldEnableEmailSync()) {
      console.log('[EmailSync] Starting worker for new route');
      startSyncWorker({
        syncIntervalMs: 2 * 60 * 1000,
        maxConcurrentSyncs: 1,
        retryAttempts: 2,
        retryDelayMs: 60 * 1000,
      });
    } else {
      console.log('[EmailSync] Stopping worker for new route');
      stopSyncWorker();
    }
  }
}, 1000); // Check route changes every second

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
