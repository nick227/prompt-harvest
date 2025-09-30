/**
 * Queue Timeout and Abort Handler
 *
 * Handles timeout enforcement, abort signal management, and cleanup
 */

export class QueueTimeoutHandler {
    constructor(activeTaskControllers) {
        this._activeTaskControllers = activeTaskControllers;
    }

    /**
     * Wrap function with timeout and AbortSignal support
     * @param {Function} fn - Function to wrap
     * @param {Object} options - Options including timeout and abortSignal
     * @returns {Function} Wrapped function
     */
    wrapWithTimeoutAndAbort(fn, options = {}) {
        const { timeout = 300000, abortSignal } = options;

        return async _args => {
            const controller = new AbortController();
            const timers = [];

            this._activeTaskControllers.add(controller);

            if (timeout && timeout > 0) {
                timers.push(setTimeout(() => controller.abort('timeout'), timeout));
            }

            const combinedResult = abortSignal
                ? this._combineAbortSignals([controller.signal, abortSignal])
                : { signal: controller.signal, cleanup: () => {} };
            const combined = combinedResult.signal;
            const cleanupAbortListeners = combinedResult.cleanup;

            const timeoutHandler = { current: null };
            const abortHandler = { current: null };
            const settled = { current: false };

            try {
                return await this._executeWithRace(
                    fn, combined, controller, timeout, settled, timeoutHandler, abortHandler
                );
            } catch (err) {
                return this._handleAbortError(err, combined, timeout);
            } finally {
                this._cleanupTimeoutAndAbort(
                    timers, cleanupAbortListeners, timeoutHandler, abortHandler, controller, combined
                );
            }
        };
    }

    /**
     * Execute function with Promise.race for timeout and abort handling
     * @param {Function} fn - Function to execute
     * @param {AbortSignal} combined - Combined abort signal
     * @param {AbortController} controller - Internal timeout controller
     * @param {number} timeout - Timeout value
     * @param {Object} settled - Settled flag object
     * @param {Object} timeoutHandler - Timeout handler reference
     * @param {Object} abortHandler - Abort handler reference
     * @returns {Promise} Promise result
     * @private
     */
    _executeWithRace(fn, combined, controller, timeout, settled, timeoutHandler, abortHandler) {
        return Promise.race([
            this._createTaskPromise(fn, combined, settled),
            this._createTimeoutPromise(controller, timeout, settled, timeoutHandler),
            this._createAbortPromise(combined, controller, settled, abortHandler)
        ]);
    }

    /**
     * Create task promise with settled flag
     * @param {Function} fn - Function to execute
     * @param {AbortSignal} combined - Combined signal
     * @param {Object} settled - Settled flag object
     * @returns {Promise} Task promise
     * @private
     */
    _createTaskPromise(fn, combined, settled) {
        return (async () => {
            const r = await fn(combined);

            settled.current = true;

            return r;
        })();
    }

    /**
     * Create timeout promise
     * @param {AbortController} controller - Timeout controller
     * @param {number} timeout - Timeout value
     * @param {Object} settled - Settled flag object
     * @param {Object} timeoutHandler - Handler reference
     * @returns {Promise} Timeout promise
     * @private
     */
    _createTimeoutPromise(controller, timeout, settled, timeoutHandler) {
        return new Promise((_, reject) => {
            timeoutHandler.current = () => {
                if (settled.current) {
                    return;
                }

                settled.current = true;
                const error = new Error(`Task timed out after ${timeout}ms`);

                error.name = 'TimeoutError';

                reject(error);
            };

            if (controller.signal.aborted) {
                timeoutHandler.current();
            } else {
                controller.signal.addEventListener('abort', timeoutHandler.current, { once: true });
            }
        });
    }

    /**
     * Create abort promise
     * @param {AbortSignal} combined - Combined signal
     * @param {AbortController} controller - Internal controller
     * @param {Object} settled - Settled flag object
     * @param {Object} abortHandler - Handler reference
     * @returns {Promise} Abort promise
     * @private
     */
    _createAbortPromise(combined, controller, settled, abortHandler) {
        return new Promise((_, reject) => {
            abortHandler.current = () => {
                if (settled.current) {
                    return;
                }

                if (!controller.signal.aborted) {
                    settled.current = true;
                    const error = new Error('Task was aborted');

                    error.name = 'AbortError';

                    reject(error);
                }
            };

            if (combined.aborted && !controller.signal.aborted) {
                abortHandler.current();
            } else if (!combined.aborted) {
                combined.addEventListener('abort', abortHandler.current, { once: true });
            }
        });
    }

    /**
     * Handle abort-related errors
     * @param {Error} err - Error to handle
     * @param {AbortSignal} combined - Combined signal
     * @param {number} timeout - Timeout value
     * @returns {Promise} Error handling result
     * @private
     */
    _handleAbortError(err, combined, timeout) {
        if (combined?.aborted) {
            const reason = combined?.reason ?? 'aborted';

            if (reason === 'timeout') {
                const e = new Error(`Task timed out after ${timeout}ms`);

                e.name = 'TimeoutError';

                throw e;
            }

            const e = new Error('Task was aborted');

            e.name = 'AbortError';

            throw e;
        }

        throw err;
    }

    /**
     * Cleanup timeout and abort handlers
     * @param {Array} timers - Timer array
     * @param {Function} cleanupAbortListeners - Cleanup function
     * @param {Object} timeoutHandler - Timeout handler
     * @param {Object} abortHandler - Abort handler
     * @param {AbortController} controller - Controller
     * @param {AbortSignal} combined - Combined signal
     * @private
     */
    _cleanupTimeoutAndAbort(timers, cleanupAbortListeners, timeoutHandler, abortHandler, controller, combined) {
        timers.forEach(clearTimeout);
        cleanupAbortListeners();

        if (timeoutHandler.current) {
            controller.signal.removeEventListener('abort', timeoutHandler.current);
        }

        if (abortHandler.current) {
            combined.removeEventListener('abort', abortHandler.current);
        }

        this._activeTaskControllers.delete(controller);
    }

    /**
     * Combine multiple AbortSignals into one
     * @param {AbortSignal[]} signals - Array of AbortSignals to combine
     * @param {string} reasonIfWeAbort - Reason to use if we abort (optional)
     * @returns {Object} Combined AbortSignal with cleanup function
     * @private
     */
    _combineAbortSignals(signals, reasonIfWeAbort = undefined) {
        const controller = new AbortController();
        const listeners = [];

        const abort = () => {
            // preserve first reason if available
            const r = signals.find(s => s.aborted)?.reason ?? reasonIfWeAbort;

            try {
                controller.abort(r);
            } catch {
                controller.abort();
            }
        };

        const cleanup = () => {
            listeners.forEach(({ signal, listener }) => {
                signal.removeEventListener('abort', listener);
            });
        };

        for (const s of signals) {
            if (s.aborted) {
                abort();
                break;
            }
            const listener = () => abort();

            s.addEventListener('abort', listener, { once: true });
            listeners.push({ signal: s, listener });
        }

        // Return both signal and cleanup function
        return { signal: controller.signal, cleanup };
    }

    /**
     * Sleep for specified milliseconds with abort support
     * @param {number} ms - Milliseconds to sleep
     * @param {AbortSignal} signal - Abort signal
     * @returns {Promise} Promise that resolves after delay
     */
    sleep(ms, signal) {
        if (!signal) {
            return new Promise(r => setTimeout(r, ms));
        }

        return new Promise((resolve, reject) => {
            let t;

            const cleanup = () => {
                clearTimeout(t);
                signal.removeEventListener('abort', onAbort);
            };

            const onAbort = () => {
                cleanup();
                reject(Object.assign(new Error('Sleep aborted'), { name: 'AbortError' }));
            };

            t = setTimeout(() => {
                cleanup();
                resolve();
            }, ms);

            if (signal.aborted) {
                return onAbort();
            }
            signal.addEventListener('abort', onAbort, { once: true });
        });
    }
}
