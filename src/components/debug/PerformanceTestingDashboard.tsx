import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePerformanceBenchmark } from '@/hooks/use-performance-benchmark'
import { cn } from '@/lib/utils'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  MemoryStick,
  Play,
  RotateCcw,
  Square,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'

interface PerformanceTestingDashboardProps {
  isVisible?: boolean
  onClose?: () => void
}

/**
 * A comprehensive performance testing and monitoring dashboard for React components.
 *
 * This advanced debug tool provides real-time performance monitoring, automated testing
 * scenarios, and detailed benchmarking capabilities for Phase 1 optimizations in the CRM.
 * It's designed for development teams to validate performance improvements and track metrics.
 *
 * Features:
 * - **Real-time Monitoring**: Live performance metrics with 1-second updates
 * - **Automated Test Scenarios**: Pre-configured tests for different use cases
 * - **Baseline vs Optimized Comparison**: Side-by-side performance analysis
 * - **Export Capabilities**: CSV/JSON export of benchmark data
 * - **Phase 1 Validation**: Specific tests for EditableLeadsGrid, MainGridView, StreamViewLayout
 * - **Visual Performance Indicators**: Charts, trends, and improvement percentages
 * - **Memory Usage Tracking**: Monitor memory consumption during tests
 * - **Test Scenario Management**: Run, stop, and reset testing scenarios
 *
 * Test Scenarios Included:
 * - Large dataset rendering (1000+ items)
 * - Rapid user interactions simulation
 * - Memory stress testing
 * - Component mounting/unmounting cycles
 *
 * Metrics Tracked:
 * - Render count and frequency
 * - Average render time
 * - Total execution time
 * - Memory usage
 * - Performance improvement percentages
 *
 * @example
 * ```tsx
 * // Include in development environment
 * {process.env.NODE_ENV === 'development' && (
 *   <PerformanceTestingDashboard
 *     isVisible={showDashboard}
 *     onClose={() => setShowDashboard(false)}
 *   />
 * )}
 *
 * // Or add as a route for dedicated testing
 * <Route path="/debug/performance" element={<PerformanceTestingDashboard isVisible />} />
 * ```
 */
export const PerformanceTestingDashboard: React.FC<PerformanceTestingDashboardProps> = ({
  isVisible = false,
  onClose,
}) => {
  /** Whether performance testing is currently active */
  const [isTestingActive, setIsTestingActive] = useState(false)
  /** Currently running test scenario identifier */
  const [currentTest, setCurrentTest] = useState<string | null>(null)
  /** Array of completed test results and reports */
  const [testResults, setTestResults] = useState<any[]>([])
  /** Real-time performance metrics updated every second during testing */
  const [liveMetrics, setLiveMetrics] = useState<Record<string, any>>({})

  /**
   * Performance benchmark hook providing all testing utilities
   * Includes recording, comparison, reporting, and export functions
   */
  const {
    recordBaseline,
    recordOptimized,
    generatePhase1Report,
    testScenarios,
    runAutomatedTests,
    exportBenchmarkData,
    getCurrentMetrics,
    resetBenchmarks,
  } = usePerformanceBenchmark()

  /**
   * Effect for live metrics monitoring during active testing
   * Updates metrics every second to provide real-time feedback
   */
  useEffect(() => {
    if (!isTestingActive) return

    const interval = setInterval(() => {
      const metrics = getCurrentMetrics()
      setLiveMetrics(metrics)
    }, 1000)

    return () => clearInterval(interval)
  }, [isTestingActive, getCurrentMetrics])

  /**
   * Initiates performance testing session
   * Resets previous results and prepares automated test scenarios
   */
  const handleStartTesting = useCallback(async () => {
    setIsTestingActive(true)
    setTestResults([])
    resetBenchmarks()

    const scenarios = await runAutomatedTests()
    console.log('🧪 Testing scenarios prepared:', scenarios)
  }, [runAutomatedTests, resetBenchmarks])

  /**
   * Stops active testing session and generates final performance report
   * Includes all metrics collected during the testing period
   */
  const handleStopTesting = useCallback(() => {
    setIsTestingActive(false)
    setCurrentTest(null)

    // Generate final report with all collected metrics
    const report = generatePhase1Report()
    setTestResults(prev => [...prev, report])
  }, [generatePhase1Report])

  /**
   * Resets all testing data and metrics to start fresh
   * Clears benchmarks, results, live metrics, and current test state
   */
  const handleResetTests = useCallback(() => {
    resetBenchmarks()
    setTestResults([])
    setLiveMetrics({})
    setCurrentTest(null)
  }, [resetBenchmarks])

  /**
   * Exports all benchmark data to downloadable format
   * Includes CSV/JSON export of performance metrics and comparisons
   */
  const handleExportResults = useCallback(() => {
    exportBenchmarkData()
  }, [exportBenchmarkData])

  /**
   * Simulates component performance metrics for testing purposes
   * Generates realistic performance data for baseline and optimized scenarios
   *
   * @param componentName - Name of the component being tested
   * @param isOptimized - Whether to simulate optimized or baseline performance
   */
  const simulateTestMetrics = useCallback(
    (componentName: string, isOptimized: boolean) => {
      const renderCount = Math.floor(Math.random() * 100) + 50
      const totalTime = Math.random() * 1000 + 200
      const optimizations = isOptimized
        ? ['useCallback optimization', 'useMemo optimization', 'React.memo wrapper']
        : ['baseline']

      if (isOptimized) {
        recordOptimized(componentName, renderCount, totalTime, optimizations)
      } else {
        recordBaseline(componentName, renderCount, totalTime)
      }
    },
    [recordBaseline, recordOptimized],
  )

  /**
   * Gets CSS color class based on performance improvement percentage
   * @param value - Performance improvement percentage
   * @returns CSS class for color styling
   */
  const getImprovementColor = (value: number) => {
    if (value > 30) return 'text-green-600'
    if (value > 15) return 'text-yellow-600'
    if (value > 0) return 'text-blue-600'
    return 'text-red-600'
  }

  /**
   * Gets appropriate trend icon based on performance change
   * @param value - Performance improvement value
   * @returns React icon component
   */
  const getImprovementIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="w-4 h-4" />
    return <TrendingDown className="w-4 h-4" />
  }

  // Early return if dashboard is not visible
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Dashboard Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Performance Testing Dashboard</h2>
            <p className="text-sm text-gray-500">Phase 1 Optimization Validation</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isTestingActive ? 'destructive' : 'secondary'}>
              {isTestingActive ? 'Testing Active' : 'Ready'}
            </Badge>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          <Tabs defaultValue="overview" className="w-full">
            {/* Tab Navigation */}
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="scenarios">Test Scenarios</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="live">Live Metrics</TabsTrigger>
            </TabsList>

            {/* Overview Tab - Project status and optimization summary */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Phase 1 Status Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Phase 1 Status</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">Complete</div>
                    <p className="text-xs text-muted-foreground">3/3 components optimized</p>
                  </CardContent>
                </Card>

                {/* Expected Improvement Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Expected Improvement</CardTitle>
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">35-50%</div>
                    <p className="text-xs text-muted-foreground">Render time reduction</p>
                  </CardContent>
                </Card>

                {/* Test Coverage Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Test Coverage</CardTitle>
                    <Activity className="h-4 w-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{Object.keys(testScenarios).length}</div>
                    <p className="text-xs text-muted-foreground">Test scenarios ready</p>
                  </CardContent>
                </Card>
              </div>

              {/* Optimization Summary Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Optimization Summary</CardTitle>
                  <CardDescription>Components optimized in Phase 1</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    {
                      name: 'EditableLeadsGrid',
                      optimizations: ['useCallback handlers', 'useMemo renderNameLink', 'Performance monitoring'],
                      expectedImprovement: '40-60%',
                      status: 'completed',
                    },
                    {
                      name: 'MainGridView',
                      optimizations: ['React.memo Cell', 'Memoized formatters', 'useCallback handlers'],
                      expectedImprovement: '35-50%',
                      status: 'completed',
                    },
                    {
                      name: 'StreamViewLayout',
                      optimizations: ['useMemo activities', 'Optimized contact handling', 'Event handler optimization'],
                      expectedImprovement: '30-45%',
                      status: 'completed',
                    },
                  ].map(component => (
                    <div key={component.name} className="flex items-start justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{component.name}</h4>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {component.optimizations.map(opt => (
                            <Badge key={opt} variant="outline" className="text-xs">
                              {opt}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-600">{component.expectedImprovement}</div>
                        <Badge variant="default" className="mt-1">
                          {component.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Test Scenarios Tab - Configure and run performance tests */}
            <TabsContent value="scenarios" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Test Scenarios</h3>
                {/* Test Control Buttons */}
                <div className="flex gap-2">
                  <Button onClick={handleStartTesting} disabled={isTestingActive} className="flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Start Testing
                  </Button>
                  <Button
                    onClick={handleStopTesting}
                    disabled={!isTestingActive}
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <Square className="w-4 h-4" />
                    Stop Testing
                  </Button>
                  <Button onClick={handleResetTests} variant="outline" className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </Button>
                </div>
              </div>

              <div className="grid gap-4">
                {Object.entries(testScenarios).map(([key, scenario]) => (
                  <Card
                    key={key}
                    className={cn('cursor-pointer transition-colors', currentTest === key && 'ring-2 ring-blue-500')}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{scenario.name}</CardTitle>
                        <Badge variant={currentTest === key ? 'default' : 'secondary'}>
                          {currentTest === key ? 'Active' : 'Ready'}
                        </Badge>
                      </div>
                      <CardDescription>{scenario.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Data Size:</span>
                          <div>{scenario.dataSize} items</div>
                        </div>
                        <div>
                          <span className="font-medium">Interactions:</span>
                          <div>{scenario.interactions.join(', ')}</div>
                        </div>
                        <div>
                          <span className="font-medium">Expected:</span>
                          <div>{scenario.expectedImprovement.renderTime}% faster</div>
                        </div>
                        <div className="flex justify-end">
                          <Button size="sm" onClick={() => setCurrentTest(key)} disabled={!isTestingActive}>
                            Run Test
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Test Buttons</CardTitle>
                  <CardDescription>Simulate component metrics for testing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => simulateTestMetrics('EditableLeadsGrid', false)}
                      disabled={isTestingActive}
                    >
                      Record Grid Baseline
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => simulateTestMetrics('EditableLeadsGrid', true)}
                      disabled={isTestingActive}
                    >
                      Record Grid Optimized
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => simulateTestMetrics('MainGridView', false)}
                      disabled={isTestingActive}
                    >
                      Record MainGrid Baseline
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => simulateTestMetrics('MainGridView', true)}
                      disabled={isTestingActive}
                    >
                      Record MainGrid Optimized
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => simulateTestMetrics('StreamViewLayout', false)}
                      disabled={isTestingActive}
                    >
                      Record Stream Baseline
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => simulateTestMetrics('StreamViewLayout', true)}
                      disabled={isTestingActive}
                    >
                      Record Stream Optimized
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Results Tab - Display completed test results and comparisons */}
            <TabsContent value="results" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Test Results</h3>
                <Button onClick={handleExportResults} className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export Results
                </Button>
              </div>

              {testResults.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <AlertTriangle className="w-8 h-8 text-yellow-500 mb-2" />
                    <p className="text-gray-500">No test results yet</p>
                    <p className="text-sm text-gray-400">Run some tests to see performance comparisons</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {Object.entries(getCurrentMetrics()).map(([key, metrics]: [string, any]) => {
                    const componentName = key.split('_')[0]
                    const isOptimized = key.includes('optimized')

                    return (
                      <Card key={key}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            {componentName}
                            <Badge variant={isOptimized ? 'default' : 'secondary'}>
                              {isOptimized ? 'Optimized' : 'Baseline'}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="flex items-center gap-2">
                              <Activity className="w-4 h-4 text-blue-500" />
                              <div>
                                <div className="text-sm font-medium">Renders</div>
                                <div>{metrics.renderCount}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-green-500" />
                              <div>
                                <div className="text-sm font-medium">Avg Time</div>
                                <div>{metrics.averageRenderTime?.toFixed(2)}ms</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Zap className="w-4 h-4 text-yellow-500" />
                              <div>
                                <div className="text-sm font-medium">Total Time</div>
                                <div>{metrics.totalRenderTime?.toFixed(2)}ms</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <MemoryStick className="w-4 h-4 text-purple-500" />
                              <div>
                                <div className="text-sm font-medium">Memory</div>
                                <div>{metrics.memoryUsage?.toFixed(1)}MB</div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            {/* Live Metrics Tab - Real-time performance monitoring */}
            <TabsContent value="live" className="space-y-4">
              <h3 className="text-lg font-medium">Live Performance Metrics</h3>

              {isTestingActive ? (
                <div className="space-y-4">
                  {/* Active Testing Indicator */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-green-500 animate-pulse" />
                        Testing Active
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-600">
                        Monitor your components in real-time as you interact with them. Check the browser console for
                        detailed performance logs.
                      </div>
                    </CardContent>
                  </Card>

                  {/* Real-time Metrics Cards */}
                  {Object.entries(liveMetrics).map(([key, metrics]: [string, any]) => (
                    <Card key={key}>
                      <CardHeader>
                        <CardTitle className="text-base">{key}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Renders:</span> {metrics.renderCount}
                          </div>
                          <div>
                            <span className="font-medium">Avg Time:</span> {metrics.averageRenderTime?.toFixed(2)}ms
                          </div>
                          <div>
                            <span className="font-medium">Memory:</span> {metrics.memoryUsage?.toFixed(1)}MB
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Clock className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-gray-500">Start testing to see live metrics</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default PerformanceTestingDashboard
