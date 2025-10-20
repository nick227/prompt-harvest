/**
 * Queue Shutdown Handler
 *
 * Handles graceful shutdown operations for the queue system
 */

import { ShutdownError } from '../queue/errors/QueueErrors.js';

export class QueueShutdown {
    constructor(queueService, lifecycle, analytics, operations) {
        this.queueService = queueService;
        this.lifecycle = lifecycle;
        this.analytics = analytics;
        this.operations = operations;
    }

    /**
     * Perform graceful shutdown
     * @param {number} timeout - Shutdown timeout in milliseconds
     * @returns {Promise} Promise that resolves when shutdown completes
     */
    async performGracefulShutdown(timeout) {
        this._prepareShutdown();
        const shutdownMetrics = this._collectShutdownMetrics();

        this._abortActiveTasks();
        this._abortQueuedTasks();

        return this._waitForShutdownCompletion(timeout, shutdownMetrics);
    }

    /**
     * Prepare system for shutdown
     * @private
     */
    _prepareShutdown() {
        // Emit shutdown started metric
        this.analytics?.recordMetrics({
            action: 'shutdown_started',
            timeout: 30000,
            timestamp: Date.now()
        });

        // Stop accepting new tasks
        this.operations.stopAcceptingTasks();

        // Stop rate limiter cleanup
        this.analytics.stopRateLimiterCleanup();
    }

    /**
     * Collect metrics about current state for shutdown
     * @returns {Object} Shutdown metrics
     * @private
     */
    _collectShutdownMetrics() {
        const start = this.queueService.getMetrics()?.current ?? {};
        const hadWorkAtStart = (start.activeJobs ?? 0) > 0 || (start.queueSize ?? 0) > 0;
        const abortedActiveCount = this._activeTaskControllers?.size ?? 0;
        const queuedTasks = start.queueSize ?? 0;

        return { hadWorkAtStart, abortedActiveCount, queuedTasks };
    }

    /**
     * Abort all active tasks
     * @private
     */
    _abortActiveTasks() {
        const abortedActiveCount = this._activeTaskControllers?.size ?? 0;

        if (abortedActiveCount > 0) {
            this.analytics?.recordMetrics({
                action: 'shutdown_aborted_inflight',
                count: abortedActiveCount,
                timestamp: Date.now()
            });

            for (const controller of this._activeTaskControllers) {
                controller.abort('shutdown');
            }
        }
    }

    /**
     * Abort queued tasks
     * @private
     */
    _abortQueuedTasks() {
        const start = this.queueService.getMetrics()?.current ?? {};
        const queuedTasks = start.queueSize ?? 0;

        if (queuedTasks > 0) {
            this.analytics?.recordMetrics({
                action: 'shutdown_dropped_queued',
                count: queuedTasks,
                timestamp: Date.now()
            });
        }

        // Abort global shutdown controller to cancel queued tasks
        this.lifecycle.abortShutdown('shutdown');
        this.lifecycle.clear();
    }

    /**
     * Wait for shutdown completion with timeout
     * @param {number} timeout - Shutdown timeout
     * @param {Object} metrics - Shutdown metrics
     * @returns {Promise} Shutdown completion promise
     * @private
     */
    async _waitForShutdownCompletion(timeout, metrics) {
        const shutdownPromise = this.queueService.onIdle();
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new ShutdownError('Shutdown timeout')), timeout);
        });

        try {
            await Promise.race([shutdownPromise, timeoutPromise]);
            this._handleShutdownCompletion(metrics);
        } catch (error) {
            this._handleShutdownError(error, timeout);
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Handle successful shutdown completion
     * @param {Object} metrics - Shutdown metrics
     * @private
     */
    _handleShutdownCompletion(metrics) {
        const { hadWorkAtStart, abortedActiveCount, queuedTasks } = metrics;

        if (hadWorkAtStart && (abortedActiveCount > 0 || queuedTasks > 0)) {
            this.analytics?.recordMetrics({
                action: 'shutdown_completed_unclean',
                abortedActiveCount,
                droppedQueuedCount: queuedTasks,
                timestamp: Date.now()
            });
            throw new ShutdownError('Shutdown completed after aborting in-flight or queued tasks');
        } else {
            this.analytics?.recordMetrics({
                action: 'shutdown_completed_clean',
                timestamp: Date.now()
            });
        }
    }

    /**
     * Handle shutdown errors
     * @param {Error} error - Shutdown error
     * @param {number} timeout - Shutdown timeout
     * @private
     */
    _handleShutdownError(error, timeout) {
        console.error('❌ QueueManager: Shutdown timeout, forcing exit');
        this.queueService.clear();

        this.analytics?.recordMetrics({
            action: 'shutdown_timeout',
            timeout,
            timestamp: Date.now()
        });
    }

    /**
     * Set active task controllers reference
     * @param {Set} activeTaskControllers - Set of active controllers
     */
    setActiveTaskControllers(activeTaskControllers) {
        this._activeTaskControllers = activeTaskControllers;
    }
}
