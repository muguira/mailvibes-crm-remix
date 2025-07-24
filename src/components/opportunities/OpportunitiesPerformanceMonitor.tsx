import React, { useEffect, useRef } from 'react';

interface OpportunitiesPerformanceMonitorProps {
  opportunities: any[];
  isLoading: boolean;
  viewMode: 'list' | 'board';
  children: React.ReactNode;
}

// Performance metrics tracking
let performanceMetrics = {
  loadTimes: [] as number[],
  renderTimes: [] as number[],
  opportunityCount: 0,
  lastMeasure: Date.now()
};

export function OpportunitiesPerformanceMonitor({
  opportunities,
  isLoading,
  viewMode,
  children
}: OpportunitiesPerformanceMonitorProps) {
  const renderStartTime = useRef<number>(Date.now());
  const loadStartTime = useRef<number>(Date.now());
  const previousOpportunitiesLength = useRef<number>(0);

  // Track loading performance
  useEffect(() => {
    if (isLoading) {
      loadStartTime.current = Date.now();
    } else if (opportunities.length > 0) {
      const loadTime = Date.now() - loadStartTime.current;
      performanceMetrics.loadTimes.push(loadTime);
      performanceMetrics.opportunityCount = opportunities.length;
      
      // Log performance metrics
      console.log(`🚀 Opportunities loading performance:`, {
        loadTime: `${loadTime}ms`,
        opportunityCount: opportunities.length,
        viewMode,
        averageLoadTime: `${(performanceMetrics.loadTimes.reduce((a, b) => a + b, 0) / performanceMetrics.loadTimes.length).toFixed(2)}ms`
      });
    }
  }, [isLoading, opportunities.length, viewMode]);

  // Track rendering performance
  useEffect(() => {
    renderStartTime.current = Date.now();
  });

  useEffect(() => {
    if (opportunities.length !== previousOpportunitiesLength.current) {
      const renderTime = Date.now() - renderStartTime.current;
      performanceMetrics.renderTimes.push(renderTime);
      previousOpportunitiesLength.current = opportunities.length;
      
      // Log render performance for significant changes
      if (renderTime > 100) { // Log only slow renders
        console.log(`🐌 Slow render detected:`, {
          renderTime: `${renderTime}ms`,
          opportunityCount: opportunities.length,
          viewMode
        });
      }
    }
  }, [opportunities.length, viewMode]);

  // Expose metrics to window for debugging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      (window as any).opportunitiesPerformance = {
        metrics: performanceMetrics,
        reset: () => {
          performanceMetrics = {
            loadTimes: [],
            renderTimes: [],
            opportunityCount: 0,
            lastMeasure: Date.now()
          };
        },
        getAverages: () => ({
          averageLoadTime: performanceMetrics.loadTimes.reduce((a, b) => a + b, 0) / performanceMetrics.loadTimes.length || 0,
          averageRenderTime: performanceMetrics.renderTimes.reduce((a, b) => a + b, 0) / performanceMetrics.renderTimes.length || 0,
          totalMeasurements: performanceMetrics.loadTimes.length
        })
      };
    }
  }, []);

  return <>{children}</>;
}

// Hook for components to report custom performance metrics
export function useOpportunityPerformance() {
  const measureTime = (label: string, fn: () => void | Promise<void>) => {
    return async () => {
      const startTime = Date.now();
      await fn();
      const endTime = Date.now();
      
      console.log(`⏱️ ${label}: ${endTime - startTime}ms`);
    };
  };

  const markMilestone = (milestone: string) => {
    const now = Date.now();
    console.log(`🏁 ${milestone} at ${now - performanceMetrics.lastMeasure}ms from last measure`);
    performanceMetrics.lastMeasure = now;
  };

  return { measureTime, markMilestone };
} 