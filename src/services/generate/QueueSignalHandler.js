/**
 * Queue Signal Handler
 *
 * Handles signal normalization and combination for queue tasks
 */

export class QueueSignalHandler {
    // Track if we've warned about deprecated abortSignal (once per process)
    static _hasWarnedAbortSignal = false;

    constructor(lifecycle, analytics, epochNow) {
        this.lifecycle = lifecycle;
        this._analytics = analytics;
        this._epochNow = epochNow;
    }

    /**
     * Setup controllers for task cancellation
     * @param {Object} options - Task options
     * @returns {Object} Controller objects
     */
    setupControllers(options) {
        let controller = null;
        let requestController = null;

        // Always combine external signals, even without requestId
        const externalSignals = [];

        if (options.abortSignal) {
            externalSignals.push(options.abortSignal);
        }

        if (options.signal) {
            externalSignals.push(options.signal);
        }

        if (options.requestId) {
            requestController = this.lifecycle.createRequestController(options.requestId, options);
            externalSignals.push(requestController.signal);
        }

        // Create controller if returnController is true and no external signals
        if (options.returnController && externalSignals.length === 0) {
            controller = new AbortController();
            externalSignals.push(controller.signal);
        }

        // Combine all signals if we have multiple
        if (externalSignals.length > 1) {
            const combined = this.lifecycle.combineAbortSignals(externalSignals);

            options.abortSignal = combined.signal;
            options._signalCleanup = combined.cleanup;
        } else if (externalSignals.length === 1) {
            const [signal] = externalSignals;

            options.abortSignal = signal;
            // No cleanup needed for single signal (not combined)
        }

        return { controller, requestController };
    }

    /**
     * Prepare abort signal
     * @param {Object} options - Task options
     * @returns {AbortSignal} Prepared signal
     */
    prepareAbortSignal(options) {
        const result = this.lifecycle.prepareAbortSignal(options);

        if (result.cleanup && !options._signalCleanup) {
            options._signalCleanup = result.cleanup;
        }

        return result.signal;
    }

    /**
     * Normalize signal options (unify signal API)
     *
     * Public API: Use options.signal (preferred)
     * Legacy alias: options.abortSignal (supported but deprecated)
     *
     * Internally, we normalize to abortSignal for consistency with downstream code.
     *
     * @param {Object} options - Task options
     */
    normalizeSignalOptions(options) {
        // Detect deprecated abortSignal usage (when used without signal)
        if (options.abortSignal && !options.signal) {
            this._emitDeprecationWarning(options);
        }

        // Normalize signal -> abortSignal (options.signal is the preferred public API)
        if (options.signal && !options.abortSignal) {
            options.abortSignal = options.signal;
        }

        // Safety: Delete original signal field to prevent downstream confusion
        if (options.signal && options.abortSignal) {
            delete options.signal;
        }
    }

    /**
     * Emit deprecation warning for abortSignal usage
     * @param {Object} options - Task options
     * @private
     */
    _emitDeprecationWarning(options) {
        // Emit metric for every usage (for accurate deprecation tracking)
        this._analytics?.recordMetrics({
            action: 'deprecated_api_used',
            api: 'abortSignal',
            requestId: options.requestId,
            userId: options.userId,
            timestamp: this._epochNow?.() || Date.now()
        });

        // Log warning once per process to avoid spam
        if (!QueueSignalHandler._hasWarnedAbortSignal) {
            QueueSignalHandler._hasWarnedAbortSignal = true;
            console.warn(
                '[QueueManager] Deprecation warning: options.abortSignal is deprecated. ' +
                'Use options.signal instead. abortSignal will be removed in a future version.'
            );
        }
    }
}
