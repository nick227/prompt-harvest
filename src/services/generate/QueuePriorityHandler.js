/**
 * Queue Priority Handler
 *
 * Handles priority normalization and metrics for consistent behavior
 * across the queue system.
 */

import { PRIORITY_MIN, PRIORITY_MAX } from './QueueConstants.js';
import { ENQUEUE_CANCEL } from './QueueSymbols.js';

export class QueuePriorityHandler {
    constructor(analytics, epochNow, logger) {
        this._analytics = analytics;
        this._epochNow = epochNow;
        this._logger = logger;
    }

    /**
     * Calculate normalized priority for consistent metrics and enqueue
     * @param {string|number} priority - Priority value to normalize
     * @param {Object} [context] - Optional context for logging (requestId, userId)
     * @returns {number} Normalized priority value (clamped to PRIORITY_MIN..PRIORITY_MAX)
     */
    calculateNormalizedPriority(priority, context = {}) {
        const priorityNumber = Number(priority);
        const numericPriority = Number.isFinite(priorityNumber)
            ? Math.trunc(priorityNumber)
            : 0;

        // Log invalid priority values (NaN/Infinity) for observability
        if (!Number.isFinite(priorityNumber)) {
            this._logger?.logWarn('Invalid priority value, normalizing to 0', {
                invalidPriority: priority,
                priorityType: typeof priority,
                requestId: context.requestId,
                userId: context.userId
            });
        }

        return Math.max(PRIORITY_MIN, Math.min(PRIORITY_MAX, numericPriority));
    }

    /**
     * Record queue add metrics
     * @param {Object} options - Task options (already normalized)
     * @param {string|number} priorityOriginal - Original priority value before normalization
     * @param {number} priorityNormalized - Actual normalized priority value that will be enqueued
     */
    recordQueueAddMetrics(options, priorityOriginal, priorityNormalized) {
        this._analytics?.recordMetrics({
            action: 'queue_add',
            userId: options.userId,
            priorityOriginal,                 // string|number as supplied by caller (or 'normal')
            priorityNormalized,               // actual normalized number that will be enqueued
            requestId: options.requestId,
            timestamp: this._epochNow()
        });
    }

    /**
     * Handle pre-aborted signal with metrics and error creation
     * @param {Object} options - Task options
     * @param {number} normalizedPriority - Normalized priority value
     * @param {Object} queueSnapshot - Queue metrics snapshot
     * @returns {Error} AbortError to throw with stable error code for HTTP mapping
     */
    handlePreAbortedSignal(options, normalizedPriority, queueSnapshot) {
        // Build metrics object, only including values when present
        const metrics = {
            action: 'task_cancelled_before_enqueue',
            requestId: options.requestId,
            userId: options.userId,
            priorityNormalized: normalizedPriority,
            phase: 'enqueue',
            timestamp: this._epochNow()
        };

        // Only include queue metrics when they're available
        if (queueSnapshot.queueSize !== undefined) {
            metrics.queueSize = queueSnapshot.queueSize;
        }
        if (queueSnapshot.activeJobs !== undefined) {
            metrics.activeJobs = queueSnapshot.activeJobs;
        }
        if (queueSnapshot.concurrency !== undefined) {
            metrics.concurrency = queueSnapshot.concurrency;
        }
        if (queueSnapshot.configMaxQueue !== undefined) {
            metrics.configMaxQueue = queueSnapshot.configMaxQueue;
        }

        this._analytics?.recordMetrics(metrics);

        const error = new Error('Task cancelled before enqueue');

        error.name = 'AbortError';
        error.code = 'ERR_TASK_ABORTED_PRE_ENQUEUE'; // Stable error code for HTTP mapping
        error.queuePhase = 'enqueue'; // Well-named property for HTTP mappers to identify lifecycle phase
        error.cause = {
            type: 'enqueue-time-cancel',
            reason: 'signal-already-aborted',
            requestId: options.requestId,
            userId: options.userId
        }; // Structured cause for log filters and SLO dashboards
        error[ENQUEUE_CANCEL] = true; // Internal symbol for robust cancel semantics

        return error;
    }
}
