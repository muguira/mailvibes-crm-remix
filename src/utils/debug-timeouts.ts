// Debug utility to track timeout conflicts
interface ActiveTimeout {
  id: number;
  component: string;
  purpose: string;
  timestamp: number;
}

class TimeoutTracker {
  private timeouts: Map<number, ActiveTimeout> = new Map();
  private nextId = 1;

  track(component: string, purpose: string, timeout: NodeJS.Timeout): number {
    const id = this.nextId++;
    this.timeouts.set(id, {
      id,
      component,
      purpose,
      timestamp: Date.now()
    });

    console.log(`⏱️ [TimeoutTracker] Started: ${component} - ${purpose} (ID: ${id})`);
    return id;
  }

  clear(id: number) {
    const timeout = this.timeouts.get(id);
    if (timeout) {
      this.timeouts.delete(id);
      const duration = Date.now() - timeout.timestamp;
      console.log(`✅ [TimeoutTracker] Cleared: ${timeout.component} - ${timeout.purpose} (${duration}ms)`);
    }
  }

  clearAll(component?: string) {
    let cleared = 0;
    for (const [id, timeout] of this.timeouts.entries()) {
      if (!component || timeout.component === component) {
        this.timeouts.delete(id);
        cleared++;
      }
    }
    
    if (cleared > 0) {
      console.log(`🧹 [TimeoutTracker] Cleared ${cleared} timeouts${component ? ` for ${component}` : ''}`);
    }
  }

  getActive(): ActiveTimeout[] {
    return Array.from(this.timeouts.values());
  }

  logActive() {
    const active = this.getActive();
    if (active.length === 0) {
      console.log('📊 [TimeoutTracker] No active timeouts');
      return;
    }

    console.group('📊 [TimeoutTracker] Active timeouts:');
    active.forEach(timeout => {
      const age = Date.now() - timeout.timestamp;
      console.log(`  - ${timeout.component} - ${timeout.purpose} (${age}ms old)`);
    });
    console.groupEnd();
  }
}

export const timeoutTracker = new TimeoutTracker();

// Enhanced setTimeout wrapper for debugging
export const debugSetTimeout = (
  callback: () => void,
  delay: number,
  component: string,
  purpose: string
): NodeJS.Timeout => {
  const timeout = setTimeout(() => {
    callback();
    // Auto-clear from tracker when timeout executes
    timeoutTracker.clear(timeoutId);
  }, delay);

  const timeoutId = timeoutTracker.track(component, purpose, timeout);
  return timeout;
};

// Enhanced clearTimeout wrapper for debugging
export const debugClearTimeout = (
  timeout: NodeJS.Timeout | null,
  component: string,
  purpose: string
) => {
  if (timeout) {
    clearTimeout(timeout);
    console.log(`🚮 [TimeoutTracker] Manual clear: ${component} - ${purpose}`);
  }
}; 