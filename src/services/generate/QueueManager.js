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
 * - All durations/latencies use the monotonic clock (performance.now)
 * - All event timestamps use the epoch clock (Date.now)
 * - Tasks are stamped with both clocks for comprehensive tracing
 */

// Time sources managed by QueueTimeUtils for consistent timing across components
import { QueueCore } from '../queue/core/QueueCore.js';
import { InitializationError, ShutdownError, ValidationError } from '../queue/errors/QueueErrors.js';
import { databaseQueueLogger } from '../queue/logging/DatabaseQueueLogger.js';
import { createEpochTimeSource, createMonotonicTimeSource } from './QueueTimeUtils.js';
import { QueueInitializationManager } from './QueueInitializationManager.js';
import { QueueValidationHelper } from './QueueValidationHelper.js';
import { ENQUEUE_CANCEL } from './QueueSymbols.js';
import { QueuePriorityHandler } from './QueuePriorityHandler.js';
import { PRIORITY_MIN, PRIORITY_MAX } from './QueueConstants.js';

// Import type definitions
import '../queue/types/QueueTypes.js';

// Re-export error classes and HTTP mapper directly for external use (tree-shaking friendly)
export { BackpressureError, RateLimitError, InitializationError, ShutdownError, ValidationError, mapQueueErrorToHttp } from '../queue/errors/QueueErrors.js';

// Re-export utility functions
export { createQueueController } from './QueueControllerFactory.js';

// Re-export priority aliases to prevent drift
export { PRIORITY_ALIASES } from '../queue/lifecycle/QueueLifecycle.js';

// Re-export priority bounds helper (not imported internally, just pass-through)
export { getPriorityBounds } from './QueueConstants.js';

// Re-export imported symbols (consolidate to avoid duplicate bindings)
export { ENQUEUE_CANCEL, PRIORITY_MIN, PRIORITY_MAX };

// Local type aliases for better IDE support
/** @typedef {import('../queue/types/QueueTypes.js').AddToQueueOptions} AddToQueueOptions */
/** @typedef {import('../queue/types/QueueTypes.js').QueueOverview} QueueOverview */
/** @typedef {import('../queue/types/QueueTypes.js').QueueMetrics} QueueMetrics */
/** @typedef {import('../queue/types/QueueTypes.js').QueueHealth} QueueHealth */

/**
 * @typedef {Object} QueueManagerOptions
 * @property {number} [concurrency=2] - Queue concurrency limit
 * @property {number} [timeout=300000] - Task timeout in milliseconds (default 5 minutes)
 * @property {Function} [epochNow] - Custom epoch time source (default: Date.now)
 * @property {Function} [monotonicNow] - Custom monotonic time source (default: performance.now)
 * @property {('rejectNew'|'cancelPrevious'|'allow')} [duplicateRequestIdPolicy='cancelPrevious'] - Duplicate ID policy
 */

/**
 * SANITY CHECKS FOR TESTING
 *
 * The following scenarios should be tested to ensure proper metric behavior:
 *
 * 1. Pre-aborted external signal
 *    → Should emit only 'task_cancelled_before_enqueue' (no 'task_enqueue_error')
 *    → Error should have code 'ERR_TASK_ABORTED_PRE_ENQUEUE' and phase: 'enqueue'
 *
 * 2. Duplicate requestId with cancelPrevious
 *    → Previous task gets exactly one cancel metric; new task runs
 *
 * 3. p-queue AbortError pre-start (native cancellation)
 *    → Should emit 'task_cancelled_before_start' exactly once with phase: 'start'
 *
 * 4. Priority normalization edge cases
 *    → Non-numeric → clamped to 0 with warning logged once
 *    → Negative → clamped to PRIORITY_MIN
 *    → >PRIORITY_MAX → clamped to PRIORITY_MAX
 *    → NaN/Infinity → normalized to 0 with warning logged once
 *
 * 5. Graceful shutdown idempotency
 *    → Multiple concurrent calls return same promise
 *    → Cleanup runs once; rate-limiter cleanup restarts only once after resumeAcceptingTasks()
 *
 * 6. Backpressure + user rate-limit
 *    → Blocks with metrics including snapshot fields (queueSize, activeJobs, concurrency, phase)
 *
 * 7. Arity warning path
 *    → Function with length 0 emits 'function_arity_warning' exactly once
 *
 * 8. Enqueue-time cancel with queue context
 *    → Should include priorityNormalized, queueSize, activeJobs, concurrency in metrics
 *
 * 9. Double cancellation prevention
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
     * Cold start threshold multiplier (configurable for ops tuning)
     * Used to calculate queue cold start detection: concurrency * COLD_START_THRESHOLD_MULTIPLIER
     */
    static COLD_START_THRESHOLD_MULTIPLIER = 2;

    /**
     * Error phase tagging for HTTP mappers
     *
     * All errors thrown from QueueManager are tagged with a queuePhase property
     * to help HTTP mappers and error handlers identify the lifecycle stage.
     *
     * Valid phases: 'init' | 'enqueue' | 'start' | 'run' | 'cleanup' | 'config'
     *
     * Example:
     *   error.queuePhase = 'enqueue';
     */

    /**
     * Create a new QueueManager instance
     * @param {QueueManagerOptions} [options={}] - Configuration options
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

        // Strip time sources from core options (avoid passing them to QueueCore)
        const { epochNow: _, monotonicNow: __, ...coreOptions } = options || {};

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

        // Initialize priority handler with logger for centralized warnings
        this._priorityHandler = new QueuePriorityHandler(this._analytics, this._epochNow, databaseQueueLogger);

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
     *   If both are supplied, caller's signal wins; returnController will be null.
     * @param {AddToQueueOptions} options - Task options
     *   Use options.signal (preferred) to pass an external AbortSignal.
     *   Legacy alias: options.abortSignal is supported but deprecated.
     * @returns {Promise|Object} Promise that resolves when generation completes, or {promise, controller} if
     *   returnController is true
     *   Note: If caller provides their own signal, only the promise is returned (controller is null)
     */
    async addToQueue(generationFunction, options = {}) {
        this._validateAddToQueueInputs(generationFunction, options);
        await this._ensureInitialization();

        // Double-gate: Check again after initialization completes (prevents adds during shutdown)
        if (!this._operations.isAcceptingTasks()) {
            const error = new ShutdownError('Queue shutdown in progress; rejecting new tasks');

            error.queuePhase = 'enqueue';
            throw error;
        }

        const priorityOriginal = options.priority ?? 'normal';

        // Capture original signal state before any processing (check both preferred and legacy APIs)
        const callerHadSignal = !!(options.signal || options.abortSignal);
        const opts = this._prepareTaskOptions(options);
        const { controller, requestController } = this._signalHandler.setupControllers(opts);
        const abortSignal = this._signalHandler.prepareAbortSignal(opts);

        // Set timestamps BEFORE pre-enqueue checks so they're available for metrics
        const timestamps = this._getEnqueuedTimestamp();

        // Store timestamps for trace correlation in metrics (before pre-enqueue checks)
        if (Object.isExtensible(opts)) {
            opts._enqueuedAtMonotonic = timestamps.monotonic;
            opts._enqueuedAtEpoch = timestamps.epoch;
        }

        this._checkPreEnqueueConditions(opts);

        const { lifecycleEntry, onStartCallback } = this._taskManager.setupTaskLifecycle(opts, requestController);
        const wrappedFunction = this._taskManager.createWrappedFunction(generationFunction, {
            options: opts,
            abortSignal,
            onStartCallback,
            enqueuedAt: timestamps.monotonic,        // Backwards-compatible field
            enqueuedAtMonotonic: timestamps.monotonic, // Explicit alias for clarity
            enqueuedAtEpoch: timestamps.epoch
        });

        // Keep a single object so _enqueueTask's write-back updates the same reference
        // Safe write: handle frozen/sealed options objects gracefully
        let enqueueOpts;

        if (Object.isExtensible(opts)) {
            // Mutate opts directly (preferred for write-back)
            opts.abortSignal = abortSignal;
            enqueueOpts = opts;
        } else {
            // Frozen/sealed opts: create new object (write-back still works on this object)
            enqueueOpts = {
                ...opts,
                abortSignal,
                _enqueuedAtMonotonic: timestamps.monotonic,
                _enqueuedAtEpoch: timestamps.epoch
            };
        }

        try {
            const promise = this._enqueueTask(wrappedFunction, enqueueOpts);

            // Record queue add metrics only after successful enqueue (gates behind abort check)
            // enqueueOpts.priority now reflects the final clamped value from _enqueueTask
            this._priorityHandler.recordQueueAddMetrics(
                enqueueOpts,
                priorityOriginal,
                enqueueOpts.priority
            );

            this._taskManager.setupTaskTracking(promise, {
                options: enqueueOpts,
                lifecycleEntry,
                requestController,
                wrappedFunction
            });

            return this._taskManager.handleReturnValue(promise, {
                options: enqueueOpts,
                requestController,
                controller,
                originalHadSignal: callerHadSignal
            });
        } catch (error) {
            this._handleEnqueueError(error, {
                opts: enqueueOpts,
                requestController,
                lifecycleEntry,
                priorityOriginal
            });

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

        // Normalize priority once and store it on opts.priority for consistent use everywhere
        // Pass context for better logging
        opts.priority = this._priorityHandler.calculateNormalizedPriority(opts.priority, {
            requestId: opts.requestId,
            userId: opts.userId
        });

        return opts;
    }


    /**
     * Get timestamps for enqueued tasks (both clocks for comprehensive tracing)
     * @returns {Object} Timestamps { monotonic: number, epoch: number }
     *   - monotonic: for latency calculations (performance.now)
     *   - epoch: for event tracing and logs (Date.now)
     * @private
     */
    _getEnqueuedTimestamp() {
        return {
            monotonic: this._monotonicNow(),
            epoch: this._epochNow()
        };
    }

    /**
     * Get queue snapshot for logging and metrics (DRY helper)
     * @returns {Object} Queue snapshot with defaults for cleaner dashboards
     * @private
     */
    _getQueueSnapshot() {
        const metrics = this.queueService?.getMetrics();
        const current = metrics?.current ?? {};

        return {
            queueSize: current.queueSize ?? 0,
            activeJobs: current.activeJobs ?? 0,
            concurrency: current.concurrency ?? this.queueService?.getConfig()?.concurrency ?? 2
        };
    }

    /**
     * Handle enqueue errors with proper cleanup
     * @param {Error} error - The error
     * @param {Object} context - Error context with opts, controllers, and priority
     * @private
     */
    _handleEnqueueError(error, context) {
        const { opts, requestController, lifecycleEntry, priorityOriginal } = context;

        // Don't log cancellations as errors (they're intentional user actions or p-queue timing)
        const isEnqueueCancel = error[ENQUEUE_CANCEL] === true;
        const isCancellation = this._taskManager.isCancellationError(error);
        const isPreStartCancel = isCancellation && !isEnqueueCancel;

        try {
            if (isEnqueueCancel) {
                // Log at info level for pre-enqueue cancels (avoids polluting error dashboards)
                databaseQueueLogger.logInfo('Task cancelled before enqueue', {
                    requestId: opts.requestId,
                    userId: opts.userId,
                    priorityOriginal,
                    priorityNormalized: opts.priority,
                    phase: 'enqueue',
                    reason: error.cause?.reason || 'signal-already-aborted',
                    ...this._getQueueSnapshot()
                });
            } else if (isPreStartCancel) {
                // Log at info level for pre-start cancels (p-queue native AbortError)
                databaseQueueLogger.logInfo('Task cancelled before start', {
                    requestId: opts.requestId,
                    userId: opts.userId,
                    priorityOriginal,
                    priorityNormalized: opts.priority,
                    phase: 'start',
                    cancelType: 'pre-start',
                    ...this._getQueueSnapshot()
                });
            } else {
                // True errors get error-level logging
                databaseQueueLogger.logError('Task enqueue failed', {
                    requestId: opts.requestId,
                    userId: opts.userId,
                    priorityOriginal,
                    priorityNormalized: opts.priority,
                    errorType: error.name,
                    phase: 'enqueue',
                    ...this._getQueueSnapshot()
                }, error);
            }
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

        return {
            // Basic metrics
            metrics: {
                ...metrics,
                current: this._getQueueSnapshot()
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
                length: metrics?.current?.queueSize ?? 0,
                isProcessing: (metrics?.current?.activeJobs ?? 0) > 0,
                isPaused: this.queueService?.isPaused() ?? false,
                concurrency: metrics?.current?.concurrency ?? this.queueService?.getConfig()?.concurrency ?? 2,
                pendingRequests: [] // p-queue limitation
            }
        };
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
     * @returns {QueueOverview} Complete queue overview
     *   - successRate: fraction 0.0-1.0 (not percentage; multiply by 100 for %)
     *   - errorRate: fraction 0.0-1.0 (not percentage; multiply by 100 for %)
     */
    getOverview() {
        const data = this._getQueueData();
        const enhancedMetrics = this.getEnhancedMetrics();
        const health = this.getDetailedHealthStatus();

        return {
            // Core status (always defined for UX)
            status: data.health.status ?? 'unknown',
            isProcessing: data.state.isProcessing,
            isPaused: data.state.isPaused,
            isAcceptingTasks: this._operations.isAcceptingTasks(),

            // Queue metrics
            queueSize: data.metrics.current.queueSize,
            activeJobs: data.metrics.current.activeJobs,
            concurrency: data.metrics.current.concurrency,

            // Performance indicators (fractions: 0.0 to 1.0)
            successRate: health?.indicators?.successRate ?? 0,
            errorRate: health?.indicators?.errorRate ?? 0,
            avgProcessingTime: enhancedMetrics?.performance?.avgProcessingTime ?? 0,

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
        if (typeof concurrency !== 'number' || !Number.isFinite(concurrency) ||
            concurrency < 1 || !Number.isInteger(concurrency)) {
            const error = new ValidationError(
                `Concurrency must be positive integer >= 1, got: ${concurrency} (${typeof concurrency})`
            );

            error.queuePhase = 'config';
            throw error;
        }

        const result = await this._initialization.updateConcurrency(concurrency);

        // Update cold start threshold to match new concurrency (using configurable multiplier)
        this._analytics?.setColdStartThreshold(concurrency * QueueManager.COLD_START_THRESHOLD_MULTIPLIER);

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
        const enqueuedAtMonotonic = lifecycleEntry?.options?._enqueuedAtMonotonic;
        const enqueuedAtEpoch = lifecycleEntry?.options?._enqueuedAtEpoch;

        const cancelled = this._lifecycle.cancelRequest(requestId);

        if (cancelled) {
            // Emit metric for user cancellation with user context
            const metrics = {
                action: 'user_cancellation',
                requestId,
                userId,
                timestamp: this._epochNow()
            };

            // Add enqueued timestamps for trace correlation (when available)
            if (enqueuedAtMonotonic !== undefined) {
                metrics.enqueuedAtMonotonic = enqueuedAtMonotonic;
            }
            if (enqueuedAtEpoch !== undefined) {
                metrics.enqueuedAtEpoch = enqueuedAtEpoch;
            }

            this._analytics?.recordMetrics(metrics);
        }

        return cancelled;
    }

    /**
     * Set the duplicate request ID policy at runtime
     * @param {string} policy - Policy to use ('rejectNew', 'cancelPrevious', 'allow')
     * @returns {string} Previous policy value for ergonomics
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

        return previousPolicy;
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
            const error = new ShutdownError('Queue shutdown in progress; rejecting new tasks');

            error.queuePhase = 'enqueue';
            throw error;
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
                const initError = new InitializationError('Initialization failed and circuit breaker is open. Please try again later.', { cause: error });

                initError.queuePhase = 'init';
                throw initError;
            }
        }
    }

    /**
     * Check pre-enqueue conditions
     * @param {Object} options - Task options
     * @private
     */
    _checkPreEnqueueConditions(options) {
        try {
            // Check backpressure (now using real caps from settings)
            this._analytics?.checkBackpressure();
        } catch (error) {
            // Record backpressure metric for observability
            const metrics = {
                action: 'backpressure_blocked',
                requestId: options.requestId,
                userId: options.userId,
                phase: 'enqueue',
                ...this._getQueueSnapshot(),
                maxQueueSize: this._analytics?.getMaxQueueSize(),
                timestamp: this._epochNow()
            };

            // Add enqueued timestamps for trace correlation (when available)
            if (options._enqueuedAtMonotonic !== undefined) {
                metrics.enqueuedAtMonotonic = options._enqueuedAtMonotonic;
            }
            if (options._enqueuedAtEpoch !== undefined) {
                metrics.enqueuedAtEpoch = options._enqueuedAtEpoch;
            }

            this._analytics?.recordMetrics(metrics);
            throw error;
        }

        // Check user rate limits
        if (options.userId) {
            try {
                this._analytics?.checkUserRateLimit(options.userId);
            } catch (error) {
                // Record rate limit metric for observability (with queue context for triage)
                const metrics = {
                    action: 'rate_limit_blocked',
                    requestId: options.requestId,
                    userId: options.userId,
                    phase: 'enqueue',
                    ...this._getQueueSnapshot(),
                    timestamp: this._epochNow()
                };

                // Add enqueued timestamps for trace correlation (when available)
                if (options._enqueuedAtMonotonic !== undefined) {
                    metrics.enqueuedAtMonotonic = options._enqueuedAtMonotonic;
                }
                if (options._enqueuedAtEpoch !== undefined) {
                    metrics.enqueuedAtEpoch = options._enqueuedAtEpoch;
                }

                this._analytics?.recordMetrics(metrics);
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
        // Priority is already normalized in _prepareTaskOptions, so use it directly
        let { priority } = options; // Already normalized

        // Belt-and-suspenders: Final clamp before enqueue (guards against caller mutation)
        // No logging here - warnings already emitted in calculateNormalizedPriority
        if (typeof priority !== 'number' || !Number.isFinite(priority)) {
            priority = 0;
        } else {
            // Clamp to valid range one more time (ensure both paths agree on PRIORITY_MIN..PRIORITY_MAX)
            priority = Math.max(PRIORITY_MIN, Math.min(PRIORITY_MAX, Math.trunc(priority)));
        }

        // Write clamped priority back to options for accurate metric logging
        // (Check extensibility in case opts was frozen upstream)
        if (Object.isExtensible(options)) {
            options.priority = priority;
        }

        // Fast-fail for already-aborted signals (improves observability)
        if (options.abortSignal?.aborted) {
            const queueSnapshot = this.queueService.getMetrics()?.current ?? {};
            const error = this._priorityHandler.handlePreAbortedSignal(options, priority, queueSnapshot);

            throw error;
        }

        // Create new options object with p-queue understood fields
        const queueOptions = {
            priority, // Fully normalized and clamped
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
            const error = new ValidationError(`Expected function, got ${typeof generationFunction}`);

            error.queuePhase = 'enqueue';
            throw error;
        }

        // Advisory: check function arity to catch callers that forgot the (signal) param
        if (generationFunction.length === 0) {
            const taskName = options.taskName || options.requestId || 'unknown';

            databaseQueueLogger.logWarn('Task function missing signal parameter', {
                taskName,
                requestId: options.requestId,
                userId: options.userId,
                message: 'Should accept (signal) => Promise for cancellation support. Pass returnController: true or provide your own signal to enable cancel.'
            });

            // Emit metric for observability (helpful during triage)
            const metrics = {
                action: 'function_arity_warning',
                arity: 0,
                taskName,
                requestId: options.requestId,
                userId: options.userId,
                timestamp: this._epochNow()
            };

            // Add enqueued timestamps for trace correlation (when available)
            if (options._enqueuedAtMonotonic !== undefined) {
                metrics.enqueuedAtMonotonic = options._enqueuedAtMonotonic;
            }
            if (options._enqueuedAtEpoch !== undefined) {
                metrics.enqueuedAtEpoch = options._enqueuedAtEpoch;
            }

            this._analytics?.recordMetrics(metrics);
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
                databaseQueueLogger.logWarn('Signal cleanup error on enqueue failure', {
                    requestId: options.requestId,
                    userId: options.userId,
                    errorType: cleanupError?.name,
                    errorMessage: cleanupError?.message
                });
            }
        }

        // Check if this is a pre-start cancellation (AbortError during enqueue)
        const isCancellation = this._taskManager.isCancellationError(error);

        if (isCancellation && options.requestId && !error[ENQUEUE_CANCEL]) {
            // This is a pre-start cancellation - record as such (skip if already recorded in enqueue)
            const metrics = {
                action: 'task_cancelled_before_start',
                requestId: options.requestId,
                userId: options.userId,
                phase: 'start',
                timestamp: this._epochNow()
            };

            // Add enqueued timestamps for trace correlation (when available)
            if (options._enqueuedAtMonotonic !== undefined) {
                metrics.enqueuedAtMonotonic = options._enqueuedAtMonotonic;
            }
            if (options._enqueuedAtEpoch !== undefined) {
                metrics.enqueuedAtEpoch = options._enqueuedAtEpoch;
            }

            this._analytics?.recordMetrics(metrics);

            return; // Early return to prevent any spurious metrics
        }

        if (!isCancellation) {
            // This is a regular enqueue error (not a cancellation)
            const metrics = {
                action: 'task_enqueue_error',
                errorType: error.name || 'UnknownError',
                phase: 'enqueue',
                timestamp: this._epochNow()
            };

            // Add enqueued timestamps for trace correlation (when available)
            if (options._enqueuedAtMonotonic !== undefined) {
                metrics.enqueuedAtMonotonic = options._enqueuedAtMonotonic;
            }
            if (options._enqueuedAtEpoch !== undefined) {
                metrics.enqueuedAtEpoch = options._enqueuedAtEpoch;
            }

            this._analytics?.recordMetrics(metrics);
        }
    }
}
