/**
 * Queue Initialization Manager
 *
 * Handles initialization of specialized managers for the queue system
 */

import { QueueLifecycle } from '../queue/lifecycle/QueueLifecycle.js';
import { QueueTimeoutHandler } from '../queue/timeout/QueueTimeoutHandler.js';
import { QueueAnalytics } from '../queue/analytics/QueueAnalytics.js';
import { QueueRateLimiterCleanup } from './QueueRateLimiterCleanup.js';
import { QueueRetryManager } from '../queue/retry/QueueRetryManager.js';
import { QueueInitialization } from '../queue/initialization/QueueInitialization.js';
import { QueueOperations } from '../queue/operations/QueueOperations.js';
import { QueueShutdown } from './QueueShutdown.js';
import { QueueValidation } from './QueueValidation.js';
import { QueueTaskManager } from './QueueTaskManager.js';
import { QueueSignalHandler } from './QueueSignalHandler.js';
import { QueueDuplicateRequestHandler } from './QueueDuplicateRequestHandler.js';

export class QueueInitializationManager {
    constructor(queueService, activeTaskControllers, epochNow, monotonicNow) {
        this.queueService = queueService;
        this._activeTaskControllers = activeTaskControllers;
        this._epochNow = epochNow;
        this._monotonicNow = monotonicNow;
    }

    /**
     * Initialize all specialized managers
     * @returns {Object} Initialized managers
     */
    initialize() {
        const lifecycle = new QueueLifecycle();
        const timeoutHandler = new QueueTimeoutHandler(this._activeTaskControllers);
        const analytics = new QueueAnalytics(this.queueService, { maxHistorySize: 1000, now: this._epochNow });

        // Rate limiter cleanup handler (after analytics is initialized)
        const rateLimiterCleanup = new QueueRateLimiterCleanup(analytics, this._epochNow);
        const retryManager = new QueueRetryManager(timeoutHandler, analytics);
        const initialization = new QueueInitialization(this.queueService);
        const operations = new QueueOperations(this.queueService, lifecycle, initialization);
        const shutdown = new QueueShutdown(this.queueService, lifecycle, analytics, operations);
        const validation = new QueueValidation(lifecycle, analytics);
        const taskManager = new QueueTaskManager(
            lifecycle,
            retryManager,
            analytics,
            this._monotonicNow
        );
        const signalHandler = new QueueSignalHandler(lifecycle);
        const duplicateRequestHandler = new QueueDuplicateRequestHandler(operations);

        return {
            lifecycle,
            timeoutHandler,
            analytics,
            rateLimiterCleanup,
            retryManager,
            initialization,
            operations,
            shutdown,
            validation,
            taskManager,
            signalHandler,
            duplicateRequestHandler
        };
    }
}
