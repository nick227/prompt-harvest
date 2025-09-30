/**
 * Queue System Utility Functions
 *
 * Generic utility functions for the queue system that can be safely
 * extracted without breaking functionality.
 */

/**
 * Warn-once utility to prevent noisy logs for repeated issues
 * @param {string} key - Unique key for the warning
 * @param {string} message - Warning message
 * @param {Set} warnedKeys - Set to track warned keys (passed by reference)
 */
export function warnOnce(key, message, warnedKeys) {
    if (!warnedKeys.has(key)) {
        warnedKeys.add(key);
        console.warn(message);
    }
}

/**
 * Create a warn-once utility bound to a specific instance
 * @param {Object} instance - Object instance to bind to
 * @returns {Function} Bound warn-once function
 */
export function createWarnOnce(instance) {
    if (!instance._warnedKeys) {
        instance._warnedKeys = new Set();
    }

    return (key, message) => warnOnce(key, message, instance._warnedKeys);
}
