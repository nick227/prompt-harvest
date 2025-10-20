/**
 * Queue Time Utilities
 *
 * Provides consistent time sources for the queue system
 */

/**
 * Create epoch time function (Date.now() style)
 * @param {Function} customEpochNow - Custom epoch time function
 * @returns {Function} Epoch time function
 */
export const createEpochTimeSource = customEpochNow => customEpochNow || (() => Date.now());

/**
 * Create monotonic time function (performance.now() style)
 * @param {Function} customMonotonicNow - Custom monotonic time function
 * @returns {Function} Monotonic time function
 */
export const createMonotonicTimeSource = customMonotonicNow => customMonotonicNow || (() => ((typeof globalThis !== 'undefined' && globalThis.performance?.now)
    ? globalThis.performance.now()
    : Date.now()));
