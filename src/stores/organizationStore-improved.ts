// Add these lines near the top of the existing organizationStore.ts file

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Helper function to check if data is fresh
const isDataFresh = (lastUpdated: string | null): boolean => {
  if (!lastUpdated) return false;
  const lastUpdate = new Date(lastUpdated).getTime();
  const now = Date.now();
  return (now - lastUpdate) < CACHE_DURATION;
};

// Then modify the loadOrganization function:
loadOrganization: async (force = false) => {
  const state = get();
  
  // Check if we have fresh data and don't need to force reload
  if (!force && state.currentOrganization && isDataFresh(state.lastUpdated)) {
    console.log('🚀 Using cached organization data');
    return;
  }

  // ... rest of the existing loadOrganization logic
},
