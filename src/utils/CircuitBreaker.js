// Circuit Breaker implementation for managing service failures
export class CircuitBreaker {
    constructor(serviceName, options = {}) {
        this.serviceName = serviceName;
        this.failureThreshold = options.failureThreshold || 5;
        this.timeout = options.timeout || 60000; // 60 seconds
        this.monitoringPeriod = options.monitoringPeriod || 60000; // 60 seconds

        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.successCount = 0;
        this.totalRequests = 0;

        // Health metrics
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            lastResponseTime: 0
        };
    }

    async execute(operation, ...args) {
        this.totalRequests++;
        this.metrics.totalRequests++;

        // Check if circuit breaker is open
        if (this.state === 'OPEN') {
            if (this.shouldAttemptReset()) {
                this.state = 'HALF_OPEN';
                // eslint-disable-next-line no-console
                console.log(`🔄 Circuit breaker for ${this.serviceName} moved to HALF_OPEN`);
            } else {
                throw new Error(
                    `Circuit breaker is OPEN for ${this.serviceName}. ` +
                    `Retry after ${this.getTimeUntilReset()}ms`
                );
            }
        }

        const startTime = Date.now();

        try {
            const result = await operation(...args);

            this.onSuccess();
            this.metrics.lastResponseTime = Date.now() - startTime;
            this.updateAverageResponseTime();

            return result;
        } catch (error) {
            this.onFailure(error);
            this.metrics.lastResponseTime = Date.now() - startTime;
            this.updateAverageResponseTime();
            throw error;
        }
    }

    onSuccess() {
        this.failureCount = 0;
        this.successCount++;
        this.metrics.successfulRequests++;

        if (this.state === 'HALF_OPEN') {
            this.state = 'CLOSED';
            // eslint-disable-next-line no-console
            console.log(`✅ Circuit breaker for ${this.serviceName} moved to CLOSED`);
        }
    }

    onFailure(error) {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        this.metrics.failedRequests++;

        // eslint-disable-next-line no-console
        console.error(`❌ Circuit breaker failure for ${this.serviceName}:`, error.message);

        if (this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
            // eslint-disable-next-line no-console
            console.log(`🚨 Circuit breaker for ${this.serviceName} moved to OPEN`);
        }
    }

    shouldAttemptReset() {
        if (!this.lastFailureTime) {
            return true;
        }

        return Date.now() - this.lastFailureTime >= this.timeout;
    }

    getTimeUntilReset() {
        if (!this.lastFailureTime) {
            return 0;
        }
        const elapsed = Date.now() - this.lastFailureTime;

        return Math.max(0, this.timeout - elapsed);
    }

    updateAverageResponseTime() {
        const total = this.metrics.successfulRequests + this.metrics.failedRequests;

        if (total > 0) {
            this.metrics.averageResponseTime =
                (this.metrics.averageResponseTime * (total - 1) + this.metrics.lastResponseTime) / total;
        }
    }

    getHealth() {
        const successRate = this.metrics.totalRequests > 0
            ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100
            : 100;

        return {
            serviceName: this.serviceName,
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            totalRequests: this.totalRequests,
            successRate: `${successRate.toFixed(2)}%`,
            averageResponseTime: `${this.metrics.averageResponseTime.toFixed(2)}ms`,
            lastResponseTime: `${this.metrics.lastResponseTime}ms`,
            timeUntilReset: this.getTimeUntilReset()
        };
    }

    reset() {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = null;
        // eslint-disable-next-line no-console
        console.log(`🔄 Circuit breaker for ${this.serviceName} manually reset`);
    }
}

// Circuit breaker manager for multiple services
export class CircuitBreakerManager {
    constructor() {
        this.breakers = new Map();
        this.defaultOptions = {
            failureThreshold: 5,
            timeout: 60000,
            monitoringPeriod: 60000
        };
    }

    getBreaker(serviceName, options = {}) {
        if (!this.breakers.has(serviceName)) {
            const breakerOptions = { ...this.defaultOptions, ...options };

            this.breakers.set(serviceName, new CircuitBreaker(serviceName, breakerOptions));
        }

        return this.breakers.get(serviceName);
    }

    async execute(serviceName, operation, options = {}) {
        const breaker = this.getBreaker(serviceName, options);

        return await breaker.execute(operation);
    }

    getHealth() {
        const health = {};

        for (const [serviceName, breaker] of this.breakers) {
            health[serviceName] = breaker.getHealth();
        }

        return health;
    }

    resetAll() {
        for (const breaker of this.breakers.values()) {
            breaker.reset();
        }
    }

    reset(serviceName) {
        const breaker = this.breakers.get(serviceName);

        if (breaker) {
            breaker.reset();
        }
    }
}

// Global circuit breaker manager instance
export const circuitBreakerManager = new CircuitBreakerManager();
