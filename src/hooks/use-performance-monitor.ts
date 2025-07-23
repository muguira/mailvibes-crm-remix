import { useEffect, useRef } from 'react'

// Extend Performance interface to include memory property
declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number
      totalJSHeapSize: number
      jsHeapSizeLimit: number
    }
  }
}

interface PerformanceMetrics {
  renderCount: number
  totalRenderTime: number
  averageRenderTime: number
  lastRenderTime: number
}

/**
 * Performance monitoring hook for measuring component optimization impact
 * Tracks render frequency, timing, and provides memory monitoring
 *
 * @param componentName - Name of the component being monitored
 * @param enabled - Whether to enable monitoring (defaults to development only)
 * @returns Performance metrics and monitoring functions
 */
export const usePerformanceMonitor = (
  componentName: string,
  enabled: boolean = process.env.NODE_ENV === 'development',
) => {
  const renderCount = useRef(0)
  const startTime = useRef(performance.now())
  const totalRenderTime = useRef(0)
  const lastRenderTime = useRef(0)
  const initialMemory = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) return

    renderCount.current++
    const renderTime = performance.now() - startTime.current
    lastRenderTime.current = renderTime
    totalRenderTime.current += renderTime

    const averageRenderTime = totalRenderTime.current / renderCount.current

    // Performance metrics tracking (logging disabled to reduce console spam)

    // Track memory usage if available
    if (performance.memory) {
      const currentMemory = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)

      if (initialMemory.current === null) {
        initialMemory.current = currentMemory
      }

      const memoryDiff = currentMemory - initialMemory.current

      if (renderCount.current % 10 === 0) {
        // Memory usage tracking (logging disabled to reduce console spam)
      }
    }

    // Reset timer for next render
    startTime.current = performance.now()
  })

  // Return performance metrics
  const getMetrics = (): PerformanceMetrics => ({
    renderCount: renderCount.current,
    totalRenderTime: totalRenderTime.current,
    averageRenderTime: totalRenderTime.current / Math.max(renderCount.current, 1),
    lastRenderTime: lastRenderTime.current,
  })

  // Function to log performance summary
  const logSummary = () => {
    if (!enabled) return

    const metrics = getMetrics()
    // Performance summary logging disabled to reduce console spam
  }

  // Function to reset metrics
  const resetMetrics = () => {
    renderCount.current = 0
    totalRenderTime.current = 0
    lastRenderTime.current = 0
    initialMemory.current = null
    startTime.current = performance.now()
  }

  return {
    getMetrics,
    logSummary,
    resetMetrics,
    renderCount: renderCount.current,
    enabled,
  }
}

/**
 * Memory monitoring hook for tracking overall application memory usage
 * Useful for detecting memory leaks during optimization
 */
export const useMemoryMonitor = (interval: number = 10000) => {
  useEffect(() => {
    if (!performance.memory || process.env.NODE_ENV !== 'development') return

    const monitorInterval = setInterval(() => {
      const memory = performance.memory!
      const used = Math.round(memory.usedJSHeapSize / 1024 / 1024)
      const total = Math.round(memory.totalJSHeapSize / 1024 / 1024)
      const limit = Math.round(memory.jsHeapSizeLimit / 1024 / 1024)

      console.log('[Memory Monitor]', {
        used: `${used}MB`,
        total: `${total}MB`,
        limit: `${limit}MB`,
        usage: `${Math.round((used / limit) * 100)}%`,
      })
    }, interval)

    return () => clearInterval(monitorInterval)
  }, [interval])
}

/**
 * Hook for measuring specific operations performance
 * Useful for measuring the impact of individual optimizations
 */
export const useOperationTimer = () => {
  const timers = useRef<Map<string, number>>(new Map())

  const startTimer = (operationName: string) => {
    timers.current.set(operationName, performance.now())
  }

  const endTimer = (operationName: string): number => {
    const startTime = timers.current.get(operationName)
    if (!startTime) {
      console.warn(`Timer '${operationName}' was not started`)
      return 0
    }

    const duration = performance.now() - startTime
    timers.current.delete(operationName)

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Operation Timer] ${operationName}: ${duration.toFixed(2)}ms`)
    }

    return duration
  }

  const measureOperation = async <T>(operationName: string, operation: () => T | Promise<T>): Promise<T> => {
    startTimer(operationName)
    try {
      const result = await operation()
      endTimer(operationName)
      return result
    } catch (error) {
      endTimer(operationName)
      throw error
    }
  }

  return {
    startTimer,
    endTimer,
    measureOperation,
  }
}
