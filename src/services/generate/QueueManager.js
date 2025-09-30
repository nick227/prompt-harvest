/**
 * Queue Manager - Main facade for concurrency-limited image generation
 *
 * Provides:
 * - Simple interface to existing code
 * - Concurrency control via p-queue
 * - Monitoring and health checking
 * - Admin controls
 * - Proper initialization and error handling
 *
 * Time Sources:
 * - All durations/latencies use the monotonic clock
 * - All event timestamps use the epoch clock
 */

// Time sources managed by QueueTimeUtils for consistent timing across components
import { QueueCore } from '../queue/core/QueueCore.js';
import { BackpressureError, RateLimitError, InitializationError, ShutdownError, ValidationError, mapQueueErrorToHttp } from '../queue/errors/QueueErrors.js';
import { databaseQueueLogger } from '../queue/logging/DatabaseQueueLogger.js';
import { createEpochTimeSource, createMonotonicTimeSource } from './QueueTimeUtils.js';
import { QueueInitializationManager } from './QueueInitializationManager.js';
import { QueueValidationHelper } from './QueueValidationHelper.js';
import { ENQUEUE_CANCEL } from './QueueSymbols.js';
import { QueuePriorityHandler } from './QueuePriorityHandler.js';
import { QueueDeprecatedMethods } from './QueueDeprecatedMethods.js';

// Import type definitions
import '../queue/types/QueueTypes.js';

// Import utility functions

// Re-export error classes and HTTP mapper for external use
export { BackpressureError, RateLimitError, InitializationError, ShutdownError, ValidationError, mapQueueErrorToHttp };

// Re-export utility functions
export { createQueueController } from './QueueControllerFactory.js';
export { ENQUEUE_CANCEL } from './QueueSymbols.js';

// Re-export priority aliases to prevent drift
export { PRIORITY_ALIASES } from '../queue/lifecycle/QueueLifecycle.js';

// Local type aliases for better IDE support
/** @typedef {import('../queue/types/QueueTypes.js').AddToQueueOptions} AddToQueueOptions */
/** @typedef {import('../queue/types/QueueTypes.js').QueueOverview} QueueOverview */
/** @typedef {import('../queue/types/QueueTypes.js').QueueMetrics} QueueMetrics */
/** @typedef {import('../queue/types/QueueTypes.js').QueueHealth} QueueHealth */

/**
 * SANITY CHECKS FOR TESTING
 *
 * The following scenarios should be tested to ensure proper metric behavior:
 *
 * 1. Enqueue with already-aborted external signal
 *    → Should emit only 'task_cancelled_before_enqueue' (no 'task_enqueue_error')
 *
 * 2. Enqueue cancel via duplicate requestId with cancelPrevious
 *    → Should emit only one cancel metric for the previous task
 *
 * 3. Pre-start cancel thrown from p-queue (native AbortError)
 *    → Should emit 'task_cancelled_before_start' exactly once
 *
 * 4. Enqueue-time cancel with queue context
 *    → Should include priorityNormalized, queueSize, activeJobs in metrics
 *
 * 5. Double cancellation prevention
 *    → Enqueue-time cancels should not trigger cleanup-time metrics
 *
 * RATE LIMITER CLEANUP PATTERN
 *
 * When implementing rate limiter cleanup, ensure:
 * - Clear rate limiter cleanup handle after shutdown completes
 * - resumeAcceptingTasks() checks isRateLimiterCleanupRunning() instead of handle
 * - This prevents stale cleanup handles across shutdowns
 */


export class QueueManager {

    /**
     * Create a new QueueManager instance
     * @param {Object} options - Configuration options
     * @param {Function} [options.epochNow] - Custom epoch time source (default: Date.now)
     * @param {Function} [options.monotonicNow] - Custom monotonic time source (default: performance.now)
     * @param {string} [options.duplicateRequestIdPolicy] - Policy for duplicate request IDs
     *   ('rejectNew', 'cancelPrevious', 'allow')
     * @param {number} [options.concurrency] - Queue concurrency limit
     * @param {number} [options.timeout] - Task timeout in milliseconds
     */
    constructor(options = {}) {
        // Default configuration for image generation
        const defaultOptions = {
            concurrency: 2,           // Default fallback - will be updated dynamically
            timeout: 300000          // 5 minute timeout
        };

        // Inject time sources for consistent timing across all components
        this._epochNow = createEpochTimeSource(options.epochNow);
        this._monotonicNow = createMonotonicTimeSource(options.monotonicNow);

        const { epochNow: _epochNow, monotonicNow: _monotonicNow, ...coreOptions } = options || {};

        this.queueService = new QueueCore({ ...defaultOptions, ...coreOptions });

        // Track active task controllers for graceful shutdown (must be before timeout handler)
        // NOTE: QueueTimeoutHandler is responsible for adding/removing controllers to this Set
        // This ensures all in-flight tasks are properly tracked and can be aborted during shutdown
        this._activeTaskControllers = new Set();

        // Initialize specialized managers
        this._initializeManagers();

        // Shutdown management
        this._shutdownPromise = null;

        // Duplicate requestId policy - managed by QueueOperations
        this._operations.setDuplicateRequestIdPolicy(options.duplicateRequestIdPolicy || 'cancelPrevious');

        // Start periodic cleanup of expired rate limiter buckets
        this._rateLimiterCleanup.start();

        // Ready promise for proper initialization handling
        this._readyPromise = this._initialization.initializeWithRetry();

    }

    /**
     * Initialize specialized managers with injected time sources
     * @private
     */
    _initializeManagers() {
        const initManager = new QueueInitializationManager(
            this.queueService,
            this._activeTaskControllers,
            this._epochNow,
            this._monotonicNow
        );

        const managers = initManager.initialize();

        // Guardrails: Assert all expected managers were returned
        QueueValidationHelper.validateManagerBundle(managers);

        // Assign managers to instance
        this._lifecycle = managers.lifecycle;
        this._timeoutHandler = managers.timeoutHandler;
        this._analytics = managers.analytics;
        this._rateLimiterCleanup = managers.rateLimiterCleanup;
        this._retryManager = managers.retryManager;
        this._initialization = managers.initialization;

        // Initialize priority handler
        this._priorityHandler = new QueuePriorityHandler(this._analytics, this._epochNow);

        // Initialize deprecated methods handler
        this._deprecatedMethods = new QueueDeprecatedMethods(this._analytics, this._epochNow);
        this._operations = managers.operations;
        this._shutdown = managers.shutdown;
        this._validation = managers.validation;
        this._taskManager = managers.taskManager;
        this._signalHandler = managers.signalHandler;
        this._duplicateRequestHandler = managers.duplicateRequestHandler;
    }


    /**
     * Add image generation request to queue
     *
     * @param {Function} generationFunction - Async function to execute
     *   Must have signature: (signal: AbortSignal) => Promise<any>
     *   The signal parameter is provided by the queue system for cancellation support.
     *   Task functions should check signal.aborted and throw AbortError when cancelled.
     *   Expected signature: (signal) => Promise<any>
     *   Note: If you want cancellation, pass your own AbortController().signal OR set returnController: true.
     * @param {AddToQueueOptions} options - Task options
     * @returns {Promise|Object} Promise that resolves when generation completes, or {promise, controller} if
     *   returnController is true
     *   Note: If caller provides their own signal, only the promise is returned (controller is null)
     */
    async addToQueue(generationFunction, options = {}) {
        this._validateAddToQueueInputs(generationFunction, options);
        await this._ensureInitialization();

        // Double-gate: Check again after initialization completes (prevents adds during shutdown)
        if (!this._operations.isAcceptingTasks()) {
            throw new ShutdownError('Queue is shutting down and not accepting new tasks');
        }

        const priorityOriginal = options.priority ?? 'normal';

        // Capture original signal state before any processing
        const callerHadSignal = !!(options.signal || options.abortSignal);
        const opts = this._prepareTaskOptions(options);
        const { controller, requestController } = this._signalHandler.setupControllers(opts);
        const abortSignal = this._signalHandler.prepareAbortSignal(opts);

        this._checkPreEnqueueConditions(opts);

        const { lifecycleEntry, onStartCallback } = this._taskManager.setupTaskLifecycle(opts, requestController);
        const wrappedFunction = this._taskManager.createWrappedFunction(generationFunction, {
            options: opts,
            abortSignal,
            onStartCallback,
            enqueuedAt: this._getEnqueuedTimestamp()
        });

        // Calculate normalized priority for consistent metrics
        const normalizedPriority = this._priorityHandler.calculateNormalizedPriority(opts.priority);

        this._priorityHandler.recordQueueAddMetrics(opts, priorityOriginal, normalizedPriority);

        try {
            const promise = this._enqueueTask(wrappedFunction, { ...opts, abortSignal });

            this._taskManager.setupTaskTracking(promise, {
                options: opts,
                lifecycleEntry,
                requestController,
                wrappedFunction
            });

            return this._taskManager.handleReturnValue(promise, {
                options: opts,
                requestController,
                controller,
                originalHadSignal: callerHadSignal
            });
        } catch (error) {
            this._handleEnqueueError(error, { opts, requestController, lifecycleEntry, priorityOriginal });
            throw error;
        }
    }

    /**
     * Prepare and validate task options
     * @param {Object} options - Original options
     * @returns {Object} Prepared options
     * @private
     */
    _prepareTaskOptions(options) {
        const opts = this._validation.validateOptions({ ...options });

        this._signalHandler.normalizeSignalOptions(opts);
        this._duplicateRequestHandler.handleDuplicateRequestIds(opts);

        return opts;
    }


    /**
     * Get high precision timestamp for enqueued tasks
     * @returns {number} Timestamp
     * @private
     */
    _getEnqueuedTimestamp() {
        return this._monotonicNow();
    }

    /**
     * Handle enqueue errors with proper cleanup
     * @param {Error} error - The error
     * @param {Object} context - Error context with opts, controllers, and priority
     * @private
     */
    _handleEnqueueError(error, context) {
        const { opts, requestController, lifecycleEntry, priorityOriginal } = context;

        try {
            databaseQueueLogger.logError('Task enqueue failed', {
                requestId: opts.requestId,
                userId: opts.userId,
                priorityOriginal,
                priorityNormalized: opts.priority,
                errorType: error.name,
                queuePhase: 'enqueue'
            }, error);
        } catch { /* swallow logging errors */ }

        this._cleanupOnEnqueueFailure(opts, requestController, lifecycleEntry, error);
    }

    /**
     * Get comprehensive queue data (single source of truth)
     * @returns {Object} Complete queue data
     * @private
     */
    _getQueueData() {
        const metrics = this.queueService?.getMetrics();
        const health = this.queueService?.getHealthStatus();
        const initState = this._initialization?.getInitState();
        const current = metrics?.current ?? {};

        return {
            // Basic metrics
            metrics: {
                ...metrics,
                current: {
                    queueSize: current.queueSize ?? 0,
                    activeJobs: current.activeJobs ?? 0,
                    concurrency: current.concurrency ?? 2
                }
            },

            // Health status
            health: {
                status: health?.status ?? 'unknown',
                warnings: health?.warnings ?? [],
                indicators: health?.indicators ?? {}
            },

            // Initialization status
            initialization: {
                isInitialized: initState?.isInitialized ?? false,
                isInitializing: initState?.isInitializing ?? false,
                lastError: initState?.lastError?.message || null,
                lastInitTime: initState?.lastInitTime || null
            },

            // Queue state
            state: {
                length: current.queueSize ?? 0,
                isProcessing: (current.activeJobs ?? 0) > 0,
                isPaused: this.queueService?.isPaused() ?? false,
                concurrency: current.concurrency ?? this.queueService?.getConfig()?.concurrency ?? 2,
                pendingRequests: [] // p-queue limitation
            }
        };
    }

    /**
     * Get queue data for monitoring (lightweight view)
     * @deprecated Use getOverview() for most use cases
     * @returns {Object} Queue data with deprecated shape
     */
    getQueueData() {
        const data = this._getQueueData();

        return this._deprecatedMethods.getQueueData(data);
    }

    /**
     * Get queue status (lightweight view)
     * @deprecated Use getOverview() for most use cases
     * @returns {Object} Queue status with deprecated shape
     */
    getQueueStatus() {
        const data = this._getQueueData();

        return this._deprecatedMethods.getQueueStatus(data);
    }

    /**
     * Get queue metrics (lightweight view)
     * @deprecated Use getOverview() for most use cases
     * @returns {Object} Queue metrics with deprecated shape
     */
    getQueueMetrics() {
        const data = this._getQueueData();

        return this._deprecatedMethods.getQueueMetrics(data);
    }

    /**
     * Get enhanced queue metrics with historical data
     * @returns {QueueMetrics} Enhanced metrics including trends
     */
    getEnhancedMetrics() {
        const data = this._getQueueData();
        const baseMetrics = data.metrics;
        const backpressureConfig = this._analytics?.getBackpressureConfig();
        const capObservability = this._analytics?.getCapObservability();

        return this._analytics?.getEnhancedMetrics(
            baseMetrics,
            () => this._analytics?.getMaxQueueSize(),
            backpressureConfig,
            capObservability
        );
    }

    /**
     * Get detailed health status with enhanced diagnostics
     * @returns {QueueHealth} Detailed health status
     */
    getDetailedHealthStatus() {
        const health = this.queueService?.getHealthStatus();
        const initState = this._initialization?.getInitState();
        const metrics = this.getEnhancedMetrics();

        const healthData = {
            status: health?.status ?? 'unknown',
            currentRequests: health?.indicators?.queueSize ?? 0,
            isProcessing: (health?.indicators?.activeJobs ?? 0) > 0,
            oldestRequest: 0, // p-queue limitation
            warnings: health?.warnings ?? [],
            initialization: {
                isInitialized: initState?.isInitialized ?? false,
                isInitializing: initState?.isInitializing ?? false,
                lastError: initState?.lastError?.message || null,
                lastInitTime: initState?.lastInitTime || null
            }
        };

        return this._analytics?.getDetailedHealthStatus(healthData, metrics);
    }

    /**
     * Get comprehensive queue overview for most consumers
     * This is the recommended method for general monitoring
     *
     * Note: successRate and errorRate are fractions (0.0 to 1.0), not percentages
     * @returns {QueueOverview} Complete queue overview
     */
    getOverview() {
        const data = this._getQueueData();
        const enhancedMetrics = this.getEnhancedMetrics();
        const health = this.getDetailedHealthStatus();

        return {
            // Core status
            status: data.health.status,
            isProcessing: data.state.isProcessing,
            isPaused: data.state.isPaused,
            isAcceptingTasks: this._operations.isAcceptingTasks(),

            // Queue metrics
            queueSize: data.metrics.current.queueSize,
            activeJobs: data.metrics.current.activeJobs,
            concurrency: data.metrics.current.concurrency,

            // Performance indicators (fractions: 0.0 to 1.0)
            successRate: health.indicators?.successRate ?? 0,
            errorRate: health.indicators?.errorRate ?? 0,
            avgProcessingTime: enhancedMetrics.performance?.avgProcessingTime ?? 0,

            // Health indicators
            warnings: data.health.warnings,
            needsAttention: this._operations.needsAttention(),
            recommendedActions: this._operations.getRecommendedActions(),

            // Initialization status
            isInitialized: data.initialization.isInitialized,
            isInitializing: data.initialization.isInitializing,
            lastError: data.initialization.lastError
        };
    }

    /**
     * Clear entire queue
     * @returns {number} Number of cleared requests
     */
    clearQueue() {
        return this._operations.clearQueue();
    }

    /**
     * Check if queue needs attention
     * @returns {boolean} True if attention needed
     */
    needsAttention() {
        return this._operations.needsAttention();
    }

    /**
     * Get recommended actions
     * @returns {Array} Recommended actions
     */
    getRecommendedActions() {
        return this._operations.getRecommendedActions();
    }

    /**
     * Pause queue processing
     */
    pause() {
        this._operations.pause();
    }

    /**
     * Resume queue processing
     */
    resume() {
        this._operations.resume();
    }

    /**
     * Check if queue is paused
     * @returns {boolean} True if paused
     */
    isPaused() {
        return this._operations.isPaused();
    }

    /**
     * Get queue configuration
     * @returns {Object} Queue configuration
     */
    getConfig() {
        return this._operations.getConfig();
    }

    /**
     * Check if queue is properly initialized
     * @returns {boolean}
     */
    isReady() {
        return this._operations.isReady();
    }

    /**
     * Wait for queue to be ready (propagates typed errors)
     * @returns {Promise<void>}
     */
    async ready() {
        return this._initialization.ready();
    }

    /**
     * Get initialization state
     * @returns {Object}
     */
    getInitState() {
        return this._operations.getInitState();
    }

    /**
     * Update queue concurrency dynamically
     * @param {number} concurrency - New concurrency value
     * @returns {Promise<Object>} Update result
     */
    async updateConcurrency(concurrency) {
        // Input guard: Validate concurrency value (must be positive integer)
        if (typeof concurrency !== 'number' || !Number.isFinite(concurrency) || concurrency < 1 || !Number.isInteger(concurrency)) {
            throw new ValidationError(`Invalid concurrency value: ${concurrency}. Must be a positive integer >= 1.`);
        }

        const result = await this._initialization.updateConcurrency(concurrency);

        // Update cold start threshold to match new concurrency
        this._analytics?.setColdStartThreshold(concurrency * 2);

        return result;
    }

    /**
     * Graceful shutdown with timeout
     * @param {number} timeout - Shutdown timeout in milliseconds
     * @returns {Promise} Promise that resolves when shutdown completes
     */
    async gracefulShutdown(timeout = 30000) {
        if (this._shutdownPromise) {
            return this._shutdownPromise;
        }

        this._shutdown.setActiveTaskControllers(this._activeTaskControllers);
        this._shutdownPromise = this._shutdown.performGracefulShutdown(timeout);

        // Reset _shutdownPromise after completion to allow future maintenance cycles
        this._shutdownPromise.finally(() => {
            this._shutdownPromise = null;
            // Clear rate limiter cleanup handle to prevent stale handles across shutdowns
            this._rateLimiterCleanup.clear();
        });

        return this._shutdownPromise;
    }

    /**
     * Check if queue is accepting new tasks
     * @returns {boolean} True if accepting new tasks
     */
    isAcceptingTasks() {
        return this._operations.isAcceptingTasks();
    }

    /**
     * Set whether queue accepts new tasks (useful for maintenance)
     * @param {boolean} accepting - Whether to accept new tasks
     */
    setAcceptingTasks(accepting) {
        this._operations.setAcceptingTasks(accepting);
    }

    /**
     * Convenience method to stop accepting new tasks (maintenance mode)
     */
    stopAcceptingTasks() {
        this._operations.stopAcceptingTasks();
    }

    /**
     * Convenience method to resume accepting new tasks
     * Note: After graceful shutdown, this recreates the shutdown controller for new tasks
     */
    resumeAcceptingTasks() {
        this._operations.resumeAcceptingTasks();

        // If shutdown controller is aborted (post-shutdown), recreate it for new tasks
        if (this._lifecycle.isShutdownAborted()) {
            this._lifecycle.recreateShutdownController();
        }

        // Restart rate limiter cleanup if it was stopped during shutdown
        this._rateLimiterCleanup.restart();
    }


    /**
     * Cancel a specific request by requestId
     * @param {string} requestId - Request ID to cancel
     * @returns {boolean} True if request was found and cancelled, false otherwise
     */
    cancelRequest(requestId) {
        // Capture context BEFORE cancellation (entry gets cleaned up after cancel)
        const lifecycleEntry = this._lifecycle.getLifecycleEntry?.(requestId);
        const userId = lifecycleEntry?.options?.userId;

        const cancelled = this._lifecycle.cancelRequest(requestId);

        if (cancelled) {
            // Emit metric for user cancellation with user context
            this._analytics?.recordMetrics({
                action: 'user_cancellation',
                requestId,
                userId,
                timestamp: this._epochNow()
            });
        }

        return cancelled;
    }

    /**
     * Set the duplicate request ID policy at runtime
     * @param {string} policy - Policy to use ('rejectNew', 'cancelPrevious', 'allow')
     */
    setDuplicateRequestIdPolicy(policy) {
        const previousPolicy = this._operations.getDuplicateRequestIdPolicy();

        this._operations.setDuplicateRequestIdPolicy(policy);

        // Emit metric for policy changes (handy during incident response)
        this._analytics?.recordMetrics({
            action: 'duplicate_requestid_policy_changed',
            previousPolicy,
            newPolicy: policy,
            timestamp: this._epochNow()
        });
    }

    /**
     * Get the current duplicate request ID policy
     * @returns {string} Current policy
     */
    getDuplicateRequestIdPolicy() {
        return this._operations.getDuplicateRequestIdPolicy();
    }

    // Private helper methods

    /**
     * Validate addToQueue inputs
     * @param {Function} generationFunction - Function to validate
     * @private
     */
    _validateAddToQueueInputs(generationFunction, options = {}) {
        // Check if accepting new tasks (graceful shutdown)
        if (!this._operations.isAcceptingTasks()) {
            throw new ShutdownError('Queue is shutting down and not accepting new tasks');
        }

        // Validate input
        this._validateGenerationFunction(generationFunction, options);
    }


    /**
     * Ensure initialization is complete
     * @returns {Promise<void>}
     * @private
     */
    async _ensureInitialization() {
        try {
            await this._readyPromise;
        } catch (error) {
            // If initialization failed, check circuit breaker before retrying
            if (this._initialization.canAttemptReinit()) {
                this._readyPromise = this._initialization.initializeWithRetry();
                await this._readyPromise;
            } else {
                throw new InitializationError('Initialization failed and circuit breaker is open. Please try again later.', { cause: error });
            }
        }
    }

    /**
     * Check pre-enqueue conditions
     * @param {Object} options - Task options
     * @private
     */
    _checkPreEnqueueConditions(options) {
        // Cache metrics to avoid duplicate calls
        const metrics = this.queueService.getMetrics();
        const current = metrics?.current ?? {};

        try {
            // Check backpressure (now using real caps from settings)
            this._analytics?.checkBackpressure();
        } catch (error) {
            // Record backpressure metric for observability
            this._analytics?.recordMetrics({
                action: 'backpressure_blocked',
                queueSize: current.queueSize ?? 0,
                activeJobs: current.activeJobs ?? 0,
                maxQueueSize: this._analytics?.getMaxQueueSize(),
                timestamp: this._epochNow()
            });
            throw error;
        }

        // Check user rate limits
        if (options.userId) {
            try {
                this._analytics?.checkUserRateLimit(options.userId);
            } catch (error) {
                // Record rate limit metric for observability
                this._analytics?.recordMetrics({
                    action: 'rate_limit_blocked',
                    userId: options.userId,
                    timestamp: this._epochNow()
                });
                throw error;
            }
        }
    }


    /**
     * Enqueue task with priority and timing
     * @param {Function} wrappedFunction - Wrapped function
     * @param {Object} options - Task options
     * @returns {Promise} Enqueued task promise
     * @private
     */
    _enqueueTask(wrappedFunction, options) {
        // Add the wrapped function to p-queue with priority and signal
        // Priority is already normalized in QueueValidation, so use it directly
        const { priority } = options; // Already normalized to p-queue format

        // Belt-and-suspenders: Final NaN check before enqueue
        if (typeof priority === 'number' && !Number.isFinite(priority)) {
            console.warn(`QueueManager: Priority ${priority} is NaN/Infinity, defaulting to 0`);
        }

        // Use consistent priority normalization
        const clampedPriority = this._priorityHandler.calculateNormalizedPriority(priority);

        // Fast-fail for already-aborted signals (improves observability)
        if (options.abortSignal?.aborted) {
            const queueSnapshot = this.queueService.getMetrics()?.current ?? {};
            const error = this._priorityHandler.handlePreAbortedSignal(options, clampedPriority, queueSnapshot);

            throw error;
        }

        // Create new options object with p-queue understood fields
        const queueOptions = {
            priority: clampedPriority, // Explicit number type for p-queue with range clamping
            signal: options.abortSignal // Re-enable p-queue's native pre-start cancellation
        };

        return this.queueService.add(wrappedFunction, queueOptions);
    }

    /**
     * Validate generation function
     * @param {Function} generationFunction - Function to validate
     * @private
     */
    _validateGenerationFunction(generationFunction, options = {}) {
        if (typeof generationFunction !== 'function') {
            throw new ValidationError('generationFunction must be a function');
        }

        // Advisory: check function arity to catch callers that forgot the (signal) param
        if (generationFunction.length === 0) {
            const taskName = options.taskName || options.requestId || 'unknown';

            console.warn(
                `QueueManager: generationFunction for task '${taskName}' should accept a signal parameter: ` +
                '(signal) => Promise'
            );

            // Emit metric for observability
            this._analytics?.recordMetrics({
                action: 'function_arity_warning',
                arity: 0,
                timestamp: this._epochNow()
            });
        }
    }


    /**
     * Cleanup on enqueue failure
     * @param {Object} options - Task options
     * @param {AbortController} requestController - Request controller
     * @param {Object} lifecycleEntry - Lifecycle entry
     * @param {Error} error - The error that caused the failure
     * @private
     */
    _cleanupOnEnqueueFailure(options, requestController, lifecycleEntry, error) {
        if (options.requestId && requestController) {
            this._lifecycle.cleanupTaskController(options.requestId, requestController);
        }

        if (options.requestId && lifecycleEntry) {
            this._lifecycle.cleanupTaskLifecycle(options.requestId, lifecycleEntry);
        }

        if (options._signalCleanup) {
            try {
                options._signalCleanup();
            } catch (cleanupError) {
                // Log but don't throw - cleanup errors shouldn't mask enqueue failures
                console.warn('QueueManager: Signal cleanup error on enqueue failure:', cleanupError);
            }
        }

        // Check if this is a pre-start cancellation (AbortError during enqueue)
        const isCancellation = this._taskManager.isCancellationError(error);

        if (isCancellation && options.requestId && !error[ENQUEUE_CANCEL]) {
            // This is a pre-start cancellation - record as such (skip if already recorded in enqueue)
            this._analytics?.recordMetrics({
                action: 'task_cancelled_before_start',
                requestId: options.requestId,
                userId: options.userId,
                timestamp: this._epochNow()
            });

            return; // Early return to prevent any spurious metrics
        }

        if (!isCancellation) {
            // This is a regular enqueue error (not a cancellation)
            this._analytics?.recordMetrics({
                action: 'task_enqueue_error',
                errorType: error.name || 'UnknownError',
                timestamp: this._epochNow()
            });
        }
    }
}


// Re-export factory functions
export { createQueueManager, getQueueManager } from './QueueManagerFactory.js';

// default-export the GETTER (not the instance)
export { getQueueManager as default } from './QueueManagerFactory.js';
