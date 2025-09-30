/**
 * Queue Core - Consolidated queue service and monitoring
 *
 * Provides:
 * - Concurrency control (max simultaneous requests)
 * - Basic queue operations (add, clear, pause, resume)
 * - Real-time monitoring and health checking
 * - Performance indicators and alerting
 * - No timeout enforcement (QueueManager handles timeouts)
 */

import PQueue from 'p-queue';

export class QueueCore {
    constructor(options = {}) {
        const {
            concurrency = 2,           // Max concurrent requests
            timeout = 300000           // Default timeout for getConfig() only
        } = options;

        // Create p-queue WITHOUT timeout enforcement
        // QueueManager is the single source of truth for timeouts
        this.queue = new PQueue({
            concurrency
            // No timeout, throwOnTimeout - QueueManager handles this
        });

        // Store default timeout for getConfig() even though p-queue doesn't enforce it
        this.defaultTimeout = timeout;

        // Basic metrics tracking
        this.metrics = {
            totalAdded: 0,
            totalProcessed: 0,
            totalFailed: 0
        };

        // Monitoring and alerting configuration
        this.alertThresholds = {
            warningQueueSize: 20,      // Warning at 20+ queued requests
            criticalQueueSize: 50,     // Critical at 50+ queued requests
            maxLatency: 300000,        // 5 minutes
            minSuccessRate: 90,        // 90% success rate minimum
            maxErrorRate: 10           // 10% error rate maximum
        };
    }

    /**
     * Add task to queue with concurrency control
     * @param {Function} task - Async function to execute (validated)
     * @param {Object} options - Task options
     * @returns {Promise} Promise that resolves when task completes
     */
    async add(task, options = {}) {
        // Guardrail: validate task is a function
        if (typeof task !== 'function') {
            throw new Error('Task must be a function');
        }

        this.metrics.totalAdded++;

        try {
            const result = await this.queue.add(task, options);

            this.metrics.totalProcessed++;

            return result;
        } catch (error) {
            this.metrics.totalFailed++;

            throw error;
        }
    }

    /**
     * Get current queue size
     * @returns {number} Number of pending requests
     */
    getSize() {
        return this.queue.size;
    }

    /**
     * Get number of currently processing requests
     * Note: Despite the name, this returns active/running count, not pending count
     * @returns {number} Number of active/running requests
     */
    getPending() {
        return this.queue.pending;
    }

    /**
     * Get queue configuration
     * @returns {Object} Queue configuration
     */
    getConfig() {
        return {
            concurrency: this.queue.concurrency,
            timeout: this.defaultTimeout // Return stable default timeout for QueueManager
        };
    }

    /**
     * Get comprehensive queue metrics with monitoring data
     * @returns {Object} Complete metrics object
     */
    getMetrics() {
        const current = {
            queueSize: this.getSize(),
            activeJobs: this.getPending(),
            concurrency: this.queue.concurrency
        };

        return {
            ...this.metrics,
            current,
            config: this.getConfig(),
            performance: this.getPerformanceMetrics()
        };
    }

    /**
     * Get queue health status
     * @returns {Object} Health status information
     */
    getHealthStatus() {
        const current = {
            queueSize: this.getSize(),
            activeJobs: this.getPending(),
            concurrency: this.queue.concurrency
        };
        const { totalProcessed, totalFailed } = this.metrics;

        const totalRequests = totalProcessed + totalFailed;
        const successRate = totalRequests > 0 ? (totalProcessed / totalRequests) * 100 : 100;
        const errorRate = totalRequests > 0 ? (totalFailed / totalRequests) * 100 : 0;

        // Determine health status
        let status = 'healthy';
        const warnings = [];
        const queueSize = current.queueSize ?? 0;
        const activeJobs = current.activeJobs ?? 0;

        if (queueSize >= this.alertThresholds.criticalQueueSize) {
            status = 'critical';
            warnings.push(`Queue size critical: ${queueSize} requests`);
        } else if (queueSize >= this.alertThresholds.warningQueueSize) {
            status = 'warning';
            warnings.push(`Queue size high: ${queueSize} requests`);
        }

        if (errorRate > this.alertThresholds.maxErrorRate) {
            status = status === 'critical' ? 'critical' : 'warning';
            warnings.push(`Error rate high: ${errorRate.toFixed(1)}%`);
        }

        if (successRate < this.alertThresholds.minSuccessRate) {
            status = status === 'critical' ? 'critical' : 'warning';
            warnings.push(`Success rate low: ${successRate.toFixed(1)}%`);
        }

        return {
            status,
            warnings,
            indicators: {
                queueSize,
                activeJobs,
                successRate: Math.round(successRate * 100) / 100,
                errorRate: Math.round(errorRate * 100) / 100
            }
        };
    }

    /**
     * Get performance metrics
     * @returns {Object} Performance indicators
     */
    getPerformanceMetrics() {
        const { totalProcessed, totalFailed } = this.metrics;
        const totalRequests = totalProcessed + totalFailed;

        return {
            throughput: {
                totalProcessed,
                totalFailed,
                successRate: totalRequests > 0 ? (totalProcessed / totalRequests) * 100 : 100
            },
            utilization: {
                queueSize: this.getSize(),
                activeJobs: this.getPending(),
                concurrency: this.queue.concurrency
            }
        };
    }

    /**
     * Get simple status for quick checks
     * @returns {Object} Simple status
     */
    getSimpleStatus() {
        return {
            isIdle: this.isIdle(),
            isPaused: this.isPaused(),
            queueSize: this.getSize(),
            activeJobs: this.getPending()
        };
    }

    /**
     * Check if queue needs attention
     * @returns {boolean} True if attention needed
     */
    needsAttention() {
        const health = this.getHealthStatus();

        return health.status === 'warning' || health.status === 'critical';
    }

    /**
     * Get recommended actions
     * @returns {Array} Recommended actions
     */
    getRecommendedActions() {
        const health = this.getHealthStatus();
        const actions = [];

        if (health.status === 'critical') {
            actions.push('Consider increasing concurrency');
            actions.push('Check for system bottlenecks');
            actions.push('Review error patterns');
        } else if (health.status === 'warning') {
            actions.push('Monitor queue size');
            actions.push('Consider scaling resources');
        }

        return actions;
    }

    /**
     * Clear all pending requests
     * Note: Only clears queued (not running) tasks - this is documented behavior
     * @returns {number} Number of cleared requests
     */
    clear() {
        const clearedCount = this.queue.size;

        this.queue.clear();

        return clearedCount;
    }

    /**
     * Check if queue is idle (no pending or processing requests)
     * @returns {boolean} True if idle
     */
    isIdle() {
        return this.queue.size === 0 && this.queue.pending === 0;
    }

    /**
     * Wait for queue to become idle
     * @returns {Promise} Promise that resolves when idle
     */
    async onIdle() {
        return this.queue.onIdle();
    }

    /**
     * Pause queue processing
     */
    pause() {
        this.queue.pause();
    }

    /**
     * Resume queue processing
     */
    resume() {
        this.queue.start();
    }

    /**
     * Check if queue is paused
     * @returns {boolean} True if paused
     */
    isPaused() {
        return this.queue.isPaused;
    }
}

export default QueueCore;
