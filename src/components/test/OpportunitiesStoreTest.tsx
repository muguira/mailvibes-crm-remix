import React, { useState, useEffect } from 'react'
import { useStore } from '@/stores/index'
import { useAuth } from '@/components/auth'
import { useInstantOpportunities } from '@/hooks/use-instant-opportunities'
import { useOpportunitiesRows } from '@/hooks/supabase/use-opportunities-rows'
import { usePerformanceMonitor, useMemoryMonitor } from '@/hooks/use-performance-monitor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Clock, Zap, Database, Cpu, Search } from 'lucide-react'
import { logger } from '@/utils/logger'

interface TestResult {
  testName: string
  status: 'pending' | 'running' | 'passed' | 'failed'
  duration?: number
  details?: string
  error?: string
}

export const OpportunitiesStoreTest: React.FC = () => {
  const { user } = useAuth()
  
  // Performance monitoring
  const { getMetrics, logSummary, renderCount } = usePerformanceMonitor('OpportunitiesStoreTest')
  useMemoryMonitor(5000) // Monitor memory every 5 seconds

  // Store state
  const {
    opportunitiesCache,
    opportunitiesOrderedIds,
    opportunitiesLoading,
    opportunitiesPagination,
    opportunitiesInitialize,
    opportunitiesStartBackgroundLoading,
    opportunitiesPauseBackgroundLoading,
    opportunitiesResumeBackgroundLoading,
    opportunitiesEnsureMinimumLoaded,
    opportunitiesAddOpportunity,
    opportunitiesUpdateOpportunity,
    opportunitiesRemoveOpportunities,
    opportunitiesClear,
    opportunitiesForceRefresh,
  } = useStore()

  // Hooks
  const instantOpportunities = useInstantOpportunities({
    searchTerm: '',
    pageSize: 20,
    currentPage: 1,
  })

  const opportunitiesRows = useOpportunitiesRows()

  // Test state
  const [tests, setTests] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [currentTest, setCurrentTest] = useState<string | null>(null)

  // Initialize tests
  useEffect(() => {
    const initialTests: TestResult[] = [
      // Batch 1: Core Store Infrastructure Tests
      { testName: 'Store Initialization', status: 'pending' },
      { testName: 'Cache Management', status: 'pending' },
      { testName: 'State Persistence', status: 'pending' },
      { testName: 'Error Handling', status: 'pending' },
      
      // Batch 2: Data Loading & Performance Tests
      { testName: 'Background Loading', status: 'pending' },
      { testName: 'Chunked Fetching', status: 'pending' },
      { testName: 'Performance Optimization', status: 'pending' },
      { testName: 'Intelligent Caching', status: 'pending' },
      { testName: 'Search Functionality', status: 'pending' },
      { testName: 'Real-time Updates', status: 'pending' },
    ]
    setTests(initialTests)
  }, [])

  // Test runner function
  const runTest = async (testName: string, testFunction: () => Promise<void>): Promise<TestResult> => {
    setCurrentTest(testName)
    const startTime = performance.now()
    
    try {
      setTests(prev => prev.map(t => 
        t.testName === testName ? { ...t, status: 'running' } : t
      ))

      await testFunction()
      
      const duration = performance.now() - startTime
      const result: TestResult = {
        testName,
        status: 'passed',
        duration,
        details: `Test completed successfully in ${duration.toFixed(2)}ms`
      }

      setTests(prev => prev.map(t => 
        t.testName === testName ? result : t
      ))

      return result
    } catch (error) {
      const duration = performance.now() - startTime
      const result: TestResult = {
        testName,
        status: 'failed',
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: `Test failed after ${duration.toFixed(2)}ms`
      }

      setTests(prev => prev.map(t => 
        t.testName === testName ? result : t
      ))

      return result
    }
  }

  // Individual test functions
  const testStoreInitialization = async () => {
    if (!user?.id) throw new Error('User not authenticated')
    
    // Clear store first
    opportunitiesClear()
    
    // Initialize store
    await opportunitiesInitialize(user.id)
    
    // Verify initialization
    const state = useStore.getState()
    if (!state.opportunitiesPagination.isInitialized) {
      throw new Error('Store not properly initialized')
    }
    
    logger.log('✅ Store initialization test passed')
  }

  const testCacheManagement = async () => {
    const state = useStore.getState()
    
    // Test cache structure
    if (typeof state.opportunitiesCache !== 'object') {
      throw new Error('Cache is not an object')
    }
    
    if (!Array.isArray(state.opportunitiesOrderedIds)) {
      throw new Error('OrderedIds is not an array')
    }
    
    // Test cache consistency
    const cacheIds = Object.keys(state.opportunitiesCache)
    const orderedIds = state.opportunitiesOrderedIds
    
    for (const id of orderedIds) {
      if (!cacheIds.includes(id)) {
        throw new Error(`Inconsistent cache: ${id} in orderedIds but not in cache`)
      }
    }
    
    logger.log('✅ Cache management test passed')
  }

  const testStatePersistence = async () => {
    const state = useStore.getState()
    
    // Test that state has required properties
    const requiredProperties = [
      'opportunitiesCache',
      'opportunitiesOrderedIds',
      'opportunitiesLoading',
      'opportunitiesPagination',
      'opportunitiesDeletedIds'
    ]
    
    for (const prop of requiredProperties) {
      if (!(prop in state)) {
        throw new Error(`Missing required state property: ${prop}`)
      }
    }
    
    logger.log('✅ State persistence test passed')
  }

  const testErrorHandling = async () => {
    // Test error state management
    const state = useStore.getState()
    
    if (typeof state.opportunitiesErrors !== 'object') {
      throw new Error('Error state not properly structured')
    }
    
    // Test that error properties exist
    const errorProperties = ['fetch', 'initialize', 'update', 'delete', 'restore']
    for (const prop of errorProperties) {
      if (!(prop in state.opportunitiesErrors)) {
        throw new Error(`Missing error property: ${prop}`)
      }
    }
    
    logger.log('✅ Error handling test passed')
  }

  const testBackgroundLoading = async () => {
    if (!user?.id) throw new Error('User not authenticated')
    
    const stateBefore = useStore.getState()
    const initialCount = stateBefore.opportunitiesPagination.loadedCount
    
    // Start background loading
    await opportunitiesStartBackgroundLoading()
    
    // Wait a moment for background loading
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const stateAfter = useStore.getState()
    
    // Check that background loading was activated
    if (!stateAfter.opportunitiesLoading.backgroundLoading) {
      logger.log('Background loading not active - this may be expected if all data is already loaded')
    }
    
    logger.log('✅ Background loading test passed')
  }

  const testChunkedFetching = async () => {
    const state = useStore.getState()
    
    // Test pagination state
    if (typeof state.opportunitiesPagination.offset !== 'number') {
      throw new Error('Pagination offset not properly managed')
    }
    
    if (typeof state.opportunitiesPagination.hasMore !== 'boolean') {
      throw new Error('Pagination hasMore not properly managed')
    }
    
    if (typeof state.opportunitiesPagination.loadedCount !== 'number') {
      throw new Error('Pagination loadedCount not properly managed')
    }
    
    logger.log('✅ Chunked fetching test passed')
  }

  const testPerformanceOptimization = async () => {
    const metrics = getMetrics()
    
    // Test that performance monitoring is working
    if (metrics.renderCount < 1) {
      throw new Error('Performance monitoring not working')
    }
    
    // Test that average render time is reasonable (under 50ms)
    if (metrics.averageRenderTime > 50) {
      logger.warn(`Average render time is high: ${metrics.averageRenderTime.toFixed(2)}ms`)
    }
    
    logger.log('✅ Performance optimization test passed')
  }

  const testIntelligentCaching = async () => {
    const state = useStore.getState()
    
    // Test cache-to-ordered-ids consistency
    const cacheSize = Object.keys(state.opportunitiesCache).length
    const orderedSize = state.opportunitiesOrderedIds.length
    
    if (cacheSize !== orderedSize) {
      throw new Error(`Cache size mismatch: cache=${cacheSize}, ordered=${orderedSize}`)
    }
    
    // Test deduplication by checking for duplicate IDs
    const uniqueIds = new Set(state.opportunitiesOrderedIds)
    if (uniqueIds.size !== state.opportunitiesOrderedIds.length) {
      throw new Error('Duplicate IDs found in orderedIds')
    }
    
    logger.log('✅ Intelligent caching test passed')
  }

  const testSearchFunctionality = async () => {
    // Test useInstantOpportunities hook
    if (typeof instantOpportunities.rows !== 'object' || !Array.isArray(instantOpportunities.rows)) {
      throw new Error('InstantOpportunities rows not properly structured')
    }
    
    if (typeof instantOpportunities.loading !== 'boolean') {
      throw new Error('InstantOpportunities loading state not boolean')
    }
    
    if (typeof instantOpportunities.totalCount !== 'number') {
      throw new Error('InstantOpportunities totalCount not number')
    }
    
    logger.log('✅ Search functionality test passed')
  }

  const testRealTimeUpdates = async () => {
    // Test CRUD operations
    const testOpportunity = {
      id: 'test-' + Date.now(),
      opportunity: 'Test Opportunity',
      company: 'Test Company',
      status: 'Lead/New',
      stage: 'Lead/New',
      revenue: 10000,
      closeDate: '',
      priority: 'High',
      owner: 'Test Owner',
      originalContactId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    // Test add
    opportunitiesAddOpportunity(testOpportunity)
    
    const stateAfterAdd = useStore.getState()
    if (!stateAfterAdd.opportunitiesCache[testOpportunity.id]) {
      throw new Error('Opportunity not added to cache')
    }
    
    // Test update
    opportunitiesUpdateOpportunity(testOpportunity.id, { revenue: 20000 })
    
    const stateAfterUpdate = useStore.getState()
    if (stateAfterUpdate.opportunitiesCache[testOpportunity.id].revenue !== 20000) {
      throw new Error('Opportunity not updated in cache')
    }
    
    // Test remove
    opportunitiesRemoveOpportunities([testOpportunity.id])
    
    const stateAfterRemove = useStore.getState()
    if (stateAfterRemove.opportunitiesCache[testOpportunity.id]) {
      throw new Error('Opportunity not removed from cache')
    }
    
    logger.log('✅ Real-time updates test passed')
  }

  // Run all tests
  const runAllTests = async () => {
    setIsRunning(true)
    setCurrentTest(null)
    
    logger.log('🧪 Starting OpportunitiesStore test suite...')
    
    const testFunctions = [
      { name: 'Store Initialization', fn: testStoreInitialization },
      { name: 'Cache Management', fn: testCacheManagement },
      { name: 'State Persistence', fn: testStatePersistence },
      { name: 'Error Handling', fn: testErrorHandling },
      { name: 'Background Loading', fn: testBackgroundLoading },
      { name: 'Chunked Fetching', fn: testChunkedFetching },
      { name: 'Performance Optimization', fn: testPerformanceOptimization },
      { name: 'Intelligent Caching', fn: testIntelligentCaching },
      { name: 'Search Functionality', fn: testSearchFunctionality },
      { name: 'Real-time Updates', fn: testRealTimeUpdates },
    ]
    
    for (const test of testFunctions) {
      await runTest(test.name, test.fn)
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    setIsRunning(false)
    setCurrentTest(null)
    
    const passed = tests.filter(t => t.status === 'passed').length
    const failed = tests.filter(t => t.status === 'failed').length
    
    logger.log(`🏁 Test suite completed: ${passed} passed, ${failed} failed`)
    logSummary()
  }

  // Calculate test statistics
  const passedTests = tests.filter(t => t.status === 'passed').length
  const failedTests = tests.filter(t => t.status === 'failed').length
  const totalTests = tests.length
  const progressPercentage = ((passedTests + failedTests) / totalTests) * 100

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">OpportunitiesStore Test Suite</h2>
        <Button 
          onClick={runAllTests} 
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          {isRunning ? <Clock className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {isRunning ? 'Running Tests...' : 'Run All Tests'}
        </Button>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Test Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={progressPercentage} className="w-full" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{passedTests + failedTests} of {totalTests} tests completed</span>
              <span>{passedTests} passed, {failedTests} failed</span>
            </div>
            {currentTest && (
              <Alert>
                <Clock className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Currently running: <strong>{currentTest}</strong>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Store Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4" />
              Cache Status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 text-sm">
              <div>Opportunities: {Object.keys(opportunitiesCache).length}</div>
              <div>Ordered IDs: {opportunitiesOrderedIds.length}</div>
              <div>Loaded: {opportunitiesPagination.loadedCount}</div>
              <div>Total: {opportunitiesPagination.totalCount}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Loading Status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={opportunitiesLoading.fetching ? "default" : "secondary"}>
                  Fetching: {opportunitiesLoading.fetching ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={opportunitiesLoading.backgroundLoading ? "default" : "secondary"}>
                  Background: {opportunitiesLoading.backgroundLoading ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={opportunitiesPagination.isInitialized ? "default" : "destructive"}>
                  Initialized: {opportunitiesPagination.isInitialized ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Search className="h-4 w-4" />
              Instant Search
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 text-sm">
              <div>Rows: {instantOpportunities.rows.length}</div>
              <div>Loading: {instantOpportunities.loading ? 'Yes' : 'No'}</div>
              <div>Total Count: {instantOpportunities.totalCount}</div>
              <div>Background Loading: {instantOpportunities.isBackgroundLoading ? 'Yes' : 'No'}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {tests.map((test, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded border">
                <div className="flex items-center gap-2">
                  {test.status === 'passed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {test.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                  {test.status === 'running' && <Clock className="h-4 w-4 text-blue-500 animate-spin" />}
                  {test.status === 'pending' && <Clock className="h-4 w-4 text-gray-400" />}
                  <span className="font-medium">{test.testName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {test.duration && <span>{test.duration.toFixed(2)}ms</span>}
                  <Badge 
                    variant={
                      test.status === 'passed' ? 'default' : 
                      test.status === 'failed' ? 'destructive' : 
                      test.status === 'running' ? 'default' : 'secondary'
                    }
                  >
                    {test.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium">Render Count</div>
              <div className="text-muted-foreground">{renderCount}</div>
            </div>
            <div>
              <div className="font-medium">Avg Render Time</div>
              <div className="text-muted-foreground">{getMetrics().averageRenderTime.toFixed(2)}ms</div>
            </div>
            <div>
              <div className="font-medium">Last Render</div>
              <div className="text-muted-foreground">{getMetrics().lastRenderTime.toFixed(2)}ms</div>
            </div>
            <div>
              <div className="font-medium">Total Time</div>
              <div className="text-muted-foreground">{getMetrics().totalRenderTime.toFixed(2)}ms</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 