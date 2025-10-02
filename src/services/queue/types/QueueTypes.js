/**
 * Queue System Type Definitions
 *
 * Centralized type definitions for the queue system to prevent drift
 * and provide consistent JSDoc across all modules.
 */

/**
 * @typedef {Object} QueueMetrics
 * @property {string} action - Metric action name
 * @property {string} [requestId] - Request ID for correlation
 * @property {string} [userId] - User ID for rate limiting
 * @property {string|number} [priorityOriginal] - Original task priority (string or number input)
 * @property {number} [priorityNormalized] - Normalized priority (p-queue format, always number)
 * @property {number} [timestamp] - Timestamp when metric was recorded (epoch ms)
 * @property {number} [enqueuedAtMonotonic] - Task enqueue time (monotonic clock, for latency calcs)
 * @property {number} [enqueuedAtEpoch] - Task enqueue time (epoch ms, for trace correlation)
 * @property {string} [phase] - Task lifecycle phase: 'init' | 'enqueue' | 'start' | 'run' | 'cleanup'
 * @property {string} [errorType] - Error type for failed tasks
 * @property {number} [queueSize] - Current queue size
 * @property {number} [activeJobs] - Current active jobs
 * @property {number} [concurrency] - Current concurrency level
 * @property {number} [maxQueueSize] - Maximum queue size when backpressure blocked
 * @property {number} [count] - Count for shutdown metrics (aborted tasks, dropped queued)
 * @property {number} [timeout] - Timeout value for shutdown metrics
 * @property {number} [abortedActiveCount] - Number of aborted active tasks
 * @property {number} [droppedQueuedCount] - Number of dropped queued tasks
 * @property {string} [policy] - Duplicate request ID policy used
 * @property {number} [arity] - Function arity for warnings
 * @property {string} [api] - Deprecated API name for usage tracking
 * @property {string} [previousPolicy] - Previous duplicate request ID policy
 * @property {string} [newPolicy] - New duplicate request ID policy
 */

/**
 * @typedef {Object} QueueOverview
 * @property {string} status - Queue health status
 * @property {boolean} isProcessing - Whether queue is actively processing tasks
 * @property {boolean} isPaused - Whether queue is paused
 * @property {boolean} isAcceptingTasks - Whether queue accepts new tasks
 * @property {number} queueSize - Current number of queued tasks
 * @property {number} activeJobs - Current number of active tasks
 * @property {number} concurrency - Current concurrency level
 * @property {number} successRate - Success rate percentage (0-100)
 * @property {number} errorRate - Error rate percentage (0-100)
 * @property {number} avgProcessingTime - Average processing time in milliseconds
 * @property {Array<string>} warnings - Array of warning messages
 * @property {boolean} needsAttention - Whether queue needs attention
 * @property {Array<string>} recommendedActions - Recommended actions to take
 * @property {boolean} isInitialized - Whether queue is properly initialized
 * @property {boolean} isInitializing - Whether queue is currently initializing
 * @property {string|null} lastError - Last initialization error message
 */

/**
 * @typedef {Object} PriorityMapping
 * @property {string} high - Maps to 1 → -1 (highest priority)
 * @property {string} normal - Maps to 5 → -5 (default priority)
 * @property {string} low - Maps to 10 → -10 (lowest priority)
 * @property {number} [custom] - Custom numeric priority (lower = higher priority, then inverted for p-queue)
 *
 * Note: Priority aliases are defined in PRIORITY_ALIASES export from QueueLifecycle
 * to prevent documentation drift. Values: {high: 1, normal: 5, low: 10}
 */

/**
 * @typedef {Object} AddToQueueOptions
 * @property {number} [timeout] - Task timeout in milliseconds
 * @property {AbortSignal} [signal] - Abort signal for cancellation (preferred API)
 * @property {AbortSignal} [abortSignal] - Legacy alias for signal (deprecated, use 'signal' instead)
 * @property {string} [userId] - User ID for rate limiting
 * @property {string|number} [priority] - Task priority ('high', 'normal', 'low' or numeric).
 *   Lower numbers = higher priority; negative numbers allowed.
 * @property {number} [maxRetries] - Number of retries after the first attempt (default 3, clamped 0..9)
 * @property {boolean} [returnController] - Return {promise, controller} for cancellation (default false).
 *   Only returns controller if no signal provided; otherwise returns promise only
 * @property {string} [requestId] - Request ID for metric correlation
 * @property {{ onTaskStart?:Function, onTaskEnd?:Function, spanFactory?:Function }} [tracing] - Optional tracing hooks for E2E monitoring
 */

/**
 * METRICS GLOSSARY:
 * - queue_add: Task added to queue
 * - task_cancelled_before_start: Task cancelled before execution started
 * - task_cancelled_after_start: Task cancelled after execution started
 * - task_enqueue_error: Error occurred during task enqueuing
 * - backpressure_blocked: Task blocked due to queue capacity
 * - rate_limit_blocked: Task blocked due to user rate limit
 * - duplicate_requestid_handled: Duplicate request ID handled per policy
 * - user_cancellation: User explicitly cancelled a request
 * - function_arity_warning: Task function missing signal parameter
 * - rate_limiter_cleanup_restarted: Rate limiter cleanup restarted after shutdown
 * - shutdown_started: Graceful shutdown initiated
 * - shutdown_aborted_inflight: Active tasks aborted during shutdown
 * - shutdown_dropped_queued: Queued tasks dropped during shutdown
 * - shutdown_completed_clean: Shutdown completed without aborting tasks
 * - shutdown_completed_unclean: Shutdown completed after aborting tasks
 * - shutdown_timeout: Shutdown timed out and was forced
 * - timeout_clamped: Task timeout was clamped to reasonable bounds
 * - max_retries_clamped: Task maxRetries was clamped to reasonable bounds
 * - priority_normalized: Task priority was normalized to p-queue format
 * - deprecated_api_used: Deprecated API method was called (for migration tracking)
 * - duplicate_requestid_policy_changed: Duplicate request ID policy was changed at runtime
 */
