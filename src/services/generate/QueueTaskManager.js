/**
 * Queue Task Manager
 *
 * Handles task lifecycle, tracking, and execution
 */

import { ENQUEUE_CANCEL } from './QueueSymbols.js';

export class QueueTaskManager {
    constructor(lifecycle, retryManager, analytics, now = null) {
        this.lifecycle = lifecycle;
        this.retryManager = retryManager;
        this.analytics = analytics;
        this._now = now || function getTimestamp() {
            return (typeof globalThis !== 'undefined' && globalThis.performance?.now)
                ? globalThis.performance.now()
                : Date.now();
        };
    }

    /**
     * Setup task lifecycle tracking
     * @param {Object} options - Task options
     * @param {AbortController} requestController - Request controller
     * @returns {Object} Lifecycle entry and callback
     */
    setupTaskLifecycle(options, requestController) {
        let lifecycleEntry = null;
        const onStartCallback = () => {
            if (options.requestId && lifecycleEntry) {
                lifecycleEntry.started = true;
            }
        };

        if (options.requestId) {
            lifecycleEntry = this.lifecycle.trackTaskLifecycle(
                options.requestId,
                null,
                requestController,
                options
            );
        }

        return { lifecycleEntry, onStartCallback };
    }

    /**
     * Create wrapped function with retry and timeout handling
     * @param {Function} generationFunction - Original function
     * @param {Object} params - Wrapping parameters
     * @returns {Function} Wrapped function
     */
    createWrappedFunction(generationFunction, params) {
        const { options, abortSignal, onStartCallback, enqueuedAt } = params;

        // Optional tracing hooks for E2E traces
        const tracingHooks = this._getTracingHooks(options);

        return this.retryManager.wrapWithTimeoutAndRetry(
            generationFunction,
            {
                ...options,
                abortSignal,
                enqueuedAt,
                onStart: onStartCallback,
                promise: null,
                tracingHooks
            },
            onStartCallback
        );
    }

    /**
     * Setup task tracking for promises
     * @param {Promise} promise - Task promise
     * @param {Object} params - Tracking parameters
     */
    setupTaskTracking(promise, params) {
        const { options, lifecycleEntry, requestController, wrappedFunction } = params;

        if (options.requestId && lifecycleEntry) {
            lifecycleEntry.promise = promise;
            wrappedFunction._promise = promise;

            if (wrappedFunction._options) {
                wrappedFunction._options.promise = promise;
            }

            promise.catch(error => {
                const isCancellation = this.isCancellationError(error);

                if (isCancellation) {
                    this._recordCancellationMetrics(options, lifecycleEntry);
                }
                this.lifecycle.cleanupTaskLifecycle(options.requestId, lifecycleEntry);
                this.lifecycle.cleanupTaskController(options.requestId, requestController);
            });

            promise.then(() => {
                this.lifecycle.cleanupTaskLifecycle(options.requestId, lifecycleEntry);
                this.lifecycle.cleanupTaskController(options.requestId, requestController);
            });
        }

        promise.finally(() => {
            if (options._signalCleanup) {
                try {
                    options._signalCleanup();
                } catch (cleanupError) {
                    console.warn('QueueManager: Signal cleanup error:', cleanupError);
                }
            }
        });
    }

    /**
     * Handle return value based on options
     * @param {Promise} promise - Task promise
     * @param {Object} params - Return parameters
     * @returns {Promise|Object} Return value
     */
    handleReturnValue(promise, params) {
        const { options, requestController, controller, originalHadSignal } = params;

        if (options.returnController) {
            if (originalHadSignal) {
                return promise;
            }

            const controllerToReturn = options.requestId ? requestController : controller;

            return { promise, controller: controllerToReturn };
        }

        return promise;
    }

    /**
     * Get optional tracing hooks for E2E traces
     * @param {Object} options - Task options
     * @returns {Object|null} Tracing hooks or null
     * @private
     */
    _getTracingHooks(options) {
        if (!options.tracing) {
            return null;
        }

        const { onTaskStart, onTaskEnd, spanFactory } = options.tracing;

        return {
            onTaskStart: onTaskStart || null,
            onTaskEnd: onTaskEnd || null,
            spanFactory: spanFactory || null
        };
    }

    /**
     * Check if error is a cancellation error
     * @param {Error} error - Error to check
     * @returns {boolean} True if cancellation error
     */
    isCancellationError(error) {
        if (!error) { return false; }

        // Check for standard abort error names (Node.js AbortError, DOM DOMException)
        const abortErrorNames = [
            'AbortError', 'CancelError', 'CancelledError', 'CancellationError',
            'AbortedError', 'UserCancelledError', 'RequestCancelledError'
        ];

        if (abortErrorNames.includes(error.name)) {
            return true;
        }

        // Check for DOMException with AbortError name
        if (error?.cause?.name === 'AbortError') {
            return true;
        }

        // Check for enqueue-time cancellation marker (our internal symbol)
        if (error[ENQUEUE_CANCEL] === true) {
            return true;
        }

        // Check for structured cause with cancellation type
        if (error.cause?.type === 'enqueue-time-cancel') {
            return true;
        }

        // Check for abort signal related errors (Node.js and browser variants)
        const abortCodes = [
            'ABORT_ERR', 'ABORTED', 'ABORT_ERROR', 'CANCELLED', 'CANCELED',
            'USER_CANCELLED', 'REQUEST_CANCELLED', 'OPERATION_CANCELLED'
        ];

        if (abortCodes.includes(error.code)) {
            return true;
        }

        // Check for timeout-related cancellations
        if (error.name === 'TimeoutError' && error.message?.includes('abort')) {
            return true;
        }

        // Check for fetch/request cancellation (browser-specific)
        if (error.name === 'TypeError' && error.message?.includes('fetch')) {
            const message = error.message?.toLowerCase() || '';

            if (message.includes('aborted') || message.includes('cancelled')) {
                return true;
            }
        }

        // Check for axios cancellation
        if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
            return true;
        }

        // Check for promise cancellation libraries
        if (error.name === 'CancellationError' || error.isCancelled === true) {
            return true;
        }

        // Check for abort-related messages (fallback for edge cases)
        const message = error.message?.toLowerCase() || '';
        const abortKeywords = [
            'aborted', 'cancelled', 'canceled', 'task cancelled',
            'operation was aborted', 'request was aborted', 'request cancelled',
            'user cancelled', 'user canceled', 'cancelled by user',
            'abort signal', 'abort controller', 'signal aborted',
            'fetch aborted', 'request aborted', 'operation cancelled'
        ];

        return abortKeywords.some(keyword => message.includes(keyword));
    }

    /**
     * Record cancellation metrics
     * @param {Object} options - Task options
     * @param {Object} lifecycleEntry - Lifecycle entry
     * @private
     */
    _recordCancellationMetrics(options, lifecycleEntry) {
        if (!lifecycleEntry.started) {
            this.analytics?.recordMetrics({
                action: 'task_cancelled_before_start',
                requestId: options.requestId,
                timestamp: this._now()
            });
        } else {
            this.analytics?.recordMetrics({
                action: 'task_cancelled_after_start',
                requestId: options.requestId,
                timestamp: this._now()
            });
        }
    }
}
