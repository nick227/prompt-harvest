/**
 * Queue Signal Handler
 *
 * Handles signal normalization and combination for queue tasks
 */

export class QueueSignalHandler {
    constructor(lifecycle) {
        this.lifecycle = lifecycle;
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
     * Normalize signal options
     * @param {Object} options - Task options
     */
    normalizeSignalOptions(options) {
        if (options.signal && !options.abortSignal) {
            options.abortSignal = options.signal;
        }

        // Safety: Delete original signal field to prevent downstream confusion
        if (options.signal && options.abortSignal) {
            delete options.signal;
        }
    }
}
