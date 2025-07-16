// Test script to verify filter values are working correctly
// Run this in the browser console on the Leads page

// Function to clear React Query cache
function clearFilterCache() {
  if (window.queryClient) {
    window.queryClient.clear();
    console.log('🧹 React Query cache cleared');
  } else {
    console.log('❌ Query client not found');
  }
}

// Function to test filter values
async function testFilterValues() {
  console.log('🔬 Testing filter values...');
  
  // Clear cache first
  clearFilterCache();
  
  // Wait a moment for cache to clear
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Try to access the hook via component inspection
  const filterButtons = document.querySelectorAll('[data-testid*="filter"], .filter-button, button');
  
  for (let button of filterButtons) {
    if (button.textContent && button.textContent.includes('Job Title')) {
      console.log('📍 Found Job Title filter button:', button);
      button.click();
      
      // Wait for dropdown to open
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const dropdown = document.querySelector('[role="listbox"], .dropdown-content, .popover-content');
      if (dropdown) {
        console.log('📋 Filter dropdown opened:', dropdown);
        const options = dropdown.querySelectorAll('[role="option"], .option, li, button');
        console.log(`📊 Found ${options.length} filter options`);
        
        options.forEach((option, index) => {
          console.log(`  ${index + 1}: "${option.textContent?.trim()}"`);
        });
      } else {
        console.log('❌ Could not find filter dropdown');
      }
      
      break;
    }
  }
}

// Function to check database directly via Supabase client
async function checkDatabaseDirectly() {
  console.log('🗄️ Checking database directly...');
  
  if (typeof supabase !== 'undefined') {
    try {
      // Get total count
      const { count } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true });
      
      console.log(`📊 Total contacts in database: ${count}`);
      
      // Get contacts with jobTitle data
      const { data, error } = await supabase
        .from('contacts')
        .select('data')
        .not('data', 'is', null)
        .limit(200000);
      
      if (error) {
        console.error('❌ Database error:', error);
        return;
      }
      
      console.log(`📋 Retrieved ${data.length} contacts with data`);
      
      // Extract jobTitle values
      const jobTitles = new Set();
      data.forEach(row => {
        if (row.data && row.data.jobTitle) {
          jobTitles.add(row.data.jobTitle);
        }
      });
      
      console.log(`🎯 Unique job titles found: ${jobTitles.size}`);
      console.log('📝 Job titles:', Array.from(jobTitles));
      
    } catch (error) {
      console.error('❌ Error checking database:', error);
    }
  } else {
    console.log('❌ Supabase client not available');
  }
}

// Make functions available globally
window.testFilterValues = testFilterValues; 
window.clearFilterCache = clearFilterCache;
window.checkDatabaseDirectly = checkDatabaseDirectly;

console.log(`
🔬 FILTER TESTING INSTRUCTIONS:

1. Clear cache: clearFilterCache()
2. Check database: checkDatabaseDirectly()
3. Test filters: testFilterValues()

Or follow these manual steps:
1. Make sure you're on the Leads page
2. Open the Job Title filter dropdown
3. Check if values from ALL pages are shown
4. Look for console logs showing data fetch results

Expected behavior:
- Filters should show ALL unique values from database
- NOT just values from currently loaded pages  
- Console should show "Retrieved X contacts for JSONB extraction" where X > 1000
- Should see "Using hook values" instead of "Using local values"
`); 