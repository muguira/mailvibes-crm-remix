import { useRef, useCallback, useMemo } from 'react'

interface BenchmarkMetrics {
  componentName: string
  renderCount: number
  averageRenderTime: number
  totalRenderTime: number
  memoryUsage: number
  lastMeasuredAt: string
  optimizationsApplied: string[]
}

interface BenchmarkComparison {
  before: BenchmarkMetrics
  after: BenchmarkMetrics
  improvement: {
    renderTimeReduction: number
    renderCountReduction: number
    memoryReduction: number
    performanceGain: number
  }
}

/**
 * Performance benchmarking hook for measuring optimization impacts
 * Designed specifically for testing our Phase 1 memoization improvements
 */
export const usePerformanceBenchmark = () => {
  const benchmarkResults = useRef<Map<string, BenchmarkMetrics>>(new Map())
  const testStartTime = useRef<number>(performance.now())

  // Store baseline metrics before optimizations
  const recordBaseline = useCallback(
    (componentName: string, renderCount: number, totalRenderTime: number, memoryUsage?: number) => {
      const metrics: BenchmarkMetrics = {
        componentName,
        renderCount,
        averageRenderTime: totalRenderTime / renderCount,
        totalRenderTime,
        memoryUsage: memoryUsage || performance.memory?.usedJSHeapSize / 1024 / 1024 || 0,
        lastMeasuredAt: new Date().toISOString(),
        optimizationsApplied: ['baseline'],
      }

      benchmarkResults.current.set(`${componentName}_baseline`, metrics)
      console.log(`📊 [Benchmark] Baseline recorded for ${componentName}:`, metrics)
    },
    [],
  )

  // Record metrics after optimizations
  const recordOptimized = useCallback(
    (
      componentName: string,
      renderCount: number,
      totalRenderTime: number,
      optimizations: string[],
      memoryUsage?: number,
    ) => {
      const metrics: BenchmarkMetrics = {
        componentName,
        renderCount,
        averageRenderTime: totalRenderTime / renderCount,
        totalRenderTime,
        memoryUsage: memoryUsage || performance.memory?.usedJSHeapSize / 1024 / 1024 || 0,
        lastMeasuredAt: new Date().toISOString(),
        optimizationsApplied: optimizations,
      }

      benchmarkResults.current.set(`${componentName}_optimized`, metrics)
      console.log(`🚀 [Benchmark] Optimized metrics recorded for ${componentName}:`, metrics)
    },
    [],
  )

  // Compare baseline vs optimized performance
  const comparePerformance = useCallback((componentName: string): BenchmarkComparison | null => {
    const baseline = benchmarkResults.current.get(`${componentName}_baseline`)
    const optimized = benchmarkResults.current.get(`${componentName}_optimized`)

    if (!baseline || !optimized) {
      console.warn(`⚠️ [Benchmark] Missing data for ${componentName} comparison`)
      return null
    }

    const renderTimeReduction =
      ((baseline.averageRenderTime - optimized.averageRenderTime) / baseline.averageRenderTime) * 100
    const renderCountReduction = ((baseline.renderCount - optimized.renderCount) / baseline.renderCount) * 100
    const memoryReduction = ((baseline.memoryUsage - optimized.memoryUsage) / baseline.memoryUsage) * 100
    const performanceGain = ((baseline.totalRenderTime - optimized.totalRenderTime) / baseline.totalRenderTime) * 100

    const comparison: BenchmarkComparison = {
      before: baseline,
      after: optimized,
      improvement: {
        renderTimeReduction: Math.round(renderTimeReduction * 100) / 100,
        renderCountReduction: Math.round(renderCountReduction * 100) / 100,
        memoryReduction: Math.round(memoryReduction * 100) / 100,
        performanceGain: Math.round(performanceGain * 100) / 100,
      },
    }

    return comparison
  }, [])

  // Generate comprehensive report for all components
  const generatePhase1Report = useCallback(() => {
    const components = ['EditableLeadsGrid', 'MainGridView', 'StreamViewLayout']
    const report = {
      testDuration: performance.now() - testStartTime.current,
      timestamp: new Date().toISOString(),
      phase: 'Phase 1 - Component Memoization',
      results: {} as Record<string, BenchmarkComparison | null>,
    }

    components.forEach(component => {
      report.results[component] = comparePerformance(component)
    })

    console.log(`📈 [Phase 1 Benchmark Report]`, report)
    return report
  }, [comparePerformance])

  // Test scenario generators for consistent benchmarking
  const testScenarios = useMemo(
    () => ({
      // Grid performance test with large dataset
      gridStressTest: {
        name: 'Grid Stress Test',
        description: 'Test grid performance with 1000+ rows and frequent cell updates',
        dataSize: 1000,
        interactions: ['scroll', 'edit', 'sort', 'filter'],
        expectedImprovement: {
          renderTime: 40, // Expected 40% improvement
          memory: 20, // Expected 20% memory reduction
          rerenders: 60, // Expected 60% fewer re-renders
        },
      },

      // Stream timeline test with many activities
      streamActivityTest: {
        name: 'Stream Activity Test',
        description: 'Test timeline performance with 100+ activities and interactions',
        dataSize: 100,
        interactions: ['scroll', 'pin', 'edit', 'delete'],
        expectedImprovement: {
          renderTime: 35,
          memory: 15,
          rerenders: 50,
        },
      },

      // Real-world usage simulation
      realWorldTest: {
        name: 'Real World Usage',
        description: 'Simulate typical user workflows across all components',
        dataSize: 500,
        interactions: ['navigate', 'search', 'edit', 'filter', 'scroll'],
        expectedImprovement: {
          renderTime: 30,
          memory: 18,
          rerenders: 45,
        },
      },
    }),
    [],
  )

  // Automated test runner for all scenarios
  const runAutomatedTests = useCallback(async () => {
    console.log('🧪 [Automated Testing] Starting Phase 1 performance tests...')

    const results = []
    for (const [scenarioKey, scenario] of Object.entries(testScenarios)) {
      console.log(`🔬 Running ${scenario.name}...`)

      // This would integrate with actual component testing
      // For now, we'll simulate the test structure
      const testResult = {
        scenario: scenarioKey,
        ...scenario,
        status: 'ready_for_manual_testing',
        instructions: `
1. Load ${scenario.description}
2. Perform interactions: ${scenario.interactions.join(', ')}
3. Measure performance with browser DevTools
4. Record metrics using recordBaseline() and recordOptimized()
        `.trim(),
      }

      results.push(testResult)
    }

    console.log('📋 [Test Instructions] Manual testing scenarios prepared:', results)
    return results
  }, [testScenarios])

  // Export benchmark data for analysis
  const exportBenchmarkData = useCallback(() => {
    const data = {
      timestamp: new Date().toISOString(),
      phase: 'Phase 1 - Component Memoization',
      optimizations: [
        'EditableLeadsGrid: useCallback for handlers, useMemo for renderNameLink',
        'MainGridView: React.memo for Cell, memoized formatters and handlers',
        'StreamViewLayout: useMemo for activities and contact processing',
        'TimelineItem: React.memo with optimized calculations',
      ],
      results: Object.fromEntries(benchmarkResults.current),
      recommendations: [
        'Monitor render counts during heavy interactions',
        'Check memory usage with large datasets',
        'Validate user experience improvements',
        'Consider further optimizations based on results',
      ],
    }

    // Create downloadable JSON
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mailvibes-crm-phase1-benchmark-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    console.log('💾 [Export] Benchmark data exported successfully')
    return data
  }, [])

  return {
    // Core benchmarking functions
    recordBaseline,
    recordOptimized,
    comparePerformance,
    generatePhase1Report,

    // Testing utilities
    testScenarios,
    runAutomatedTests,
    exportBenchmarkData,

    // Current metrics
    getCurrentMetrics: () => Object.fromEntries(benchmarkResults.current),

    // Reset for new tests
    resetBenchmarks: () => {
      benchmarkResults.current.clear()
      testStartTime.current = performance.now()
      console.log('🔄 [Benchmark] Reset completed')
    },
  }
}

/**
 * Hook for real-time performance monitoring during testing
 * Integrates with our existing usePerformanceMonitor
 */
export const usePerformanceTesting = (componentName: string, isOptimized: boolean = false) => {
  const renderTimes = useRef<number[]>([])
  const renderCount = useRef(0)
  const startTime = useRef(performance.now())

  const recordRender = useCallback(
    (renderTime: number) => {
      renderTimes.current.push(renderTime)
      renderCount.current++

      // Log every 10 renders during testing
      if (renderCount.current % 10 === 0) {
        const avgTime = renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length
        const totalTime = renderTimes.current.reduce((a, b) => a + b, 0)

        console.log(
          `📊 [${componentName}] ${isOptimized ? 'OPTIMIZED' : 'BASELINE'} - Renders: ${renderCount.current}, Avg: ${avgTime.toFixed(2)}ms, Total: ${totalTime.toFixed(2)}ms`,
        )
      }
    },
    [componentName, isOptimized],
  )

  const getMetrics = useCallback(() => {
    const totalTime = renderTimes.current.reduce((a, b) => a + b, 0)
    const averageTime = totalTime / renderTimes.current.length || 0

    return {
      componentName,
      isOptimized,
      renderCount: renderCount.current,
      averageRenderTime: averageTime,
      totalRenderTime: totalTime,
      memoryUsage: performance.memory?.usedJSHeapSize / 1024 / 1024 || 0,
      testDuration: performance.now() - startTime.current,
    }
  }, [componentName, isOptimized])

  const reset = useCallback(() => {
    renderTimes.current = []
    renderCount.current = 0
    startTime.current = performance.now()
  }, [])

  return {
    recordRender,
    getMetrics,
    reset,
    currentRenderCount: renderCount.current,
  }
}
