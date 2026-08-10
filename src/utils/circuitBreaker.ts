export class CircuitBreaker {
  private static failures = 0;
  private static lastFailureTime = 0;
  private static THRESHOLD = 3;
  private static COOLDOWN_MS = 15000;

  static async execute<T>(
    operationName: string,
    operation: () => Promise<T>,
    fallback?: () => T | Promise<T>
  ): Promise<T> {
    if (!navigator.onLine) {
      console.warn(`[Network] Offline. Aborting ${operationName}.`);
      if (fallback) return fallback();
      throw new Error("Network offline");
    }

    const now = Date.now();
    if (this.failures >= this.THRESHOLD) {
      if (now - this.lastFailureTime < this.COOLDOWN_MS) {
        console.warn(`[CircuitBreaker] Open. Cooldown active. Skipping ${operationName}.`);
        if (fallback) return fallback();
        throw new Error("Circuit breaker open");
      }
      // Half-open state
      this.failures = this.THRESHOLD - 1;
    }

    try {
      const result = await operation();
      this.failures = 0; // Reset on success
      return result;
    } catch (error: any) {
      this.failures++;
      this.lastFailureTime = Date.now();
      const errStr = (error?.message || String(error)).toLowerCase();
      const isTransient =
        errStr.includes("failed to fetch") ||
        errStr.includes("network") ||
        errStr.includes("load failed") ||
        errStr.includes("upstream connect error") ||
        errStr.includes("connection timeout") ||
        errStr.includes("disconnect/reset") ||
        errStr.includes("timeout") ||
        errStr.includes("schema cache") ||
        errStr.includes("circuit breaker") ||
        errStr.includes("retrying") ||
        errStr.includes("pgrst");
      
      if (isTransient) {
        console.info(`[CircuitBreaker] Transient notice in ${operationName}. Failures: ${this.failures}`);
      } else {
        console.info(`[CircuitBreaker] Operation note in ${operationName}. Failures: ${this.failures}`, error);
      }
      if (fallback) return fallback();
      throw error;
    }
  }
}
