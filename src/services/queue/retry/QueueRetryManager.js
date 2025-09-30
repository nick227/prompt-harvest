/**
 * Queue Retry Management
 *
 * Handles retry logic, exponential backoff, and timeout enforcement
 */

import { BackpressureError, RateLimitError, ValidationError } from '../errors/QueueErrors.js';

export class QueueRetryManager {
    constructor(timeoutHandler, analytics) {
        this._timeoutHandler = timeoutHandler;
        this._analytics = analytics;

        // Retry configuration
        this._retryConfig = {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000
        };
    }

    /**
     * Execute function with retry logic and exponential backoff
     * @param {Function} operation - Function to execute
     * @param {AbortSignal} signal - Abort signal
     * @param {number} maxAttempts - Maximum number of attempts (includes initial attempt)
     * @returns {Promise} Promise that resolves when operation completes
     */
    async executeWithRetry(operation, signal, maxAttempts = 3) {
        let lastError;
        let actualAttempts = 0;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            actualAttempts++;
            try {
                const result = await operation();

                return { result, attempts: actualAttempts };
            } catch (error) {
                lastError = error;

                // Don't retry on user cancellation, validation, or operational errors
                if (signal?.aborted || error instanceof ValidationError || error.name === 'AbortError' ||
                    error instanceof BackpressureError || error instanceof RateLimitError) {
                    // Preserve original stack and add attempts annotation
                    error.attempts = actualAttempts;
                    throw error;
                }

                // Don't retry on last attempt
                if (attempt === maxAttempts - 1) {
                    break;
                }

                // Calculate exponential backoff delay
                const baseDelay = Math.min(
                    this._retryConfig.baseDelay * Math.pow(2, attempt),
                    this._retryConfig.maxDelay
                );
                const jitter = Math.random() * baseDelay * 0.1; // 10% jitter
                const delay = baseDelay + jitter;

                await this._timeoutHandler.sleep(delay, signal);
            }
        }

        // Preserve original error and stack, just add attempts annotation
        if (lastError && typeof lastError === 'object' && lastError !== null) {
            lastError.attempts = actualAttempts;
        }
        throw lastError;
    }

    /**
     * Wrap function with timeout, retry, and AbortSignal support
     * @param {Function} fn - Function to wrap
     * @param {Object} options - Options including timeout, abortSignal, retry config
     * @param {Function} onStart - Callback for when task starts
     * @param {Object} metrics - Metrics recorder
     * @param {Object} backpressure - Backpressure manager
     * @returns {Function} Wrapped function
     */
    wrapWithTimeoutAndRetry(fn, options, onStart, metrics, backpressure) {
        const {
            timeout = 300000, // Default timeout
            abortSignal,
            maxRetries = this._retryConfig.maxRetries
        } = options;

        return async _args => {
            const startTime = performance.now();
            const queueWaitMs = options.enqueuedAt ? startTime - options.enqueuedAt : 0;

            // Mark task as started for pre-start cancellation detection
            if (onStart) {
                // Get promise from the wrapper's options
                const taskPromise = options.promise;

                if (taskPromise) {
                    onStart(taskPromise);
                }
            }

            // Clamp retry configuration defensively - guarantee ≥1 attempt
            // maxRetries = number of retries after first attempt, so attempts = retries + 1
            const clampedMaxRetries = Math.max(0, Math.min(Math.floor(maxRetries || 0), 9));
            const maxAttempts = clampedMaxRetries + 1;

            // Emit task_start metric for observability
            metrics?.recordMetrics({
                action: 'task_start',
                queueWaitMs: Math.round(queueWaitMs),
                maxAttempts,
                requestId: options.requestId,
                timestamp: Date.now()
            });

            let actualAttempts = 0;

            try {
                const { result, attempts } = await this.executeWithRetry(
                    async () => await this._timeoutHandler.wrapWithTimeoutAndAbort(fn, { timeout, abortSignal })(),
                    abortSignal,
                    maxAttempts
                );

                actualAttempts = attempts;

                // Record successful completion
                const duration = Math.round(performance.now() - startTime);

                this._analytics?.recordMetrics({
                    action: 'task_complete',
                    duration,
                    queueWaitMs: Math.round(queueWaitMs),
                    actualAttempts,
                    requestId: options.requestId,
                    timestamp: Date.now()
                });

                // Update EWMA of processing time and increment completion count
                this._analytics?.updateProcessingTimeEWMA(duration);
                this._analytics?.incrementCompletionCount();

                // Emit task_finally metric for terminal event
                this._analytics?.recordMetrics({
                    action: 'task_finally',
                    duration,
                    queueWaitMs: Math.round(queueWaitMs),
                    actualAttempts,
                    success: true,
                    requestId: options.requestId,
                    timestamp: Date.now()
                });

                return result;
            } catch (errorOrResult) {
                // Handle both old error format and new error with attempts property
                const error = errorOrResult?.error || errorOrResult;

                actualAttempts = errorOrResult?.attempts ?? (actualAttempts || 1);

                // Record error
                const duration = Math.round(performance.now() - startTime);

                // Extract abort reason for better observability
                let abortReason = null;

                if (error.name === 'AbortError') {
                    // Use task's abortSignal.reason if available (Node ≥16), otherwise fall back to simple buckets
                    if (abortSignal?.reason) {
                        abortReason = abortSignal.reason;
                    } else if (error.message?.includes('shutdown')) {
                        abortReason = 'shutdown';
                    } else if (error.message?.includes('timeout')) {
                        abortReason = 'timeout';
                    } else {
                        abortReason = 'user';
                    }
                }

                this._analytics?.recordMetrics({
                    action: 'task_error',
                    duration,
                    queueWaitMs: Math.round(queueWaitMs),
                    errorType: error.name || 'UnknownError',
                    actualAttempts,
                    requestId: options.requestId,
                    ...(abortReason && { reason: abortReason }),
                    timestamp: Date.now()
                });

                // Update EWMA for timeouts and retriable failures
                const shouldUpdateEWMA = error.name === 'TimeoutError' ||
                    (error.name !== 'AbortError' && error.name !== 'ValidationError' &&
                     error.name !== 'BackpressureError' && error.name !== 'RateLimitError');

                if (shouldUpdateEWMA) {
                    this._analytics?.updateProcessingTimeEWMA(duration);
                }

                // Emit task_finally metric for terminal event
                this._analytics?.recordMetrics({
                    action: 'task_finally',
                    duration,
                    queueWaitMs: Math.round(queueWaitMs),
                    actualAttempts,
                    success: false,
                    requestId: options.requestId,
                    timestamp: Date.now()
                });

                throw error;
            }
        };
    }
}
