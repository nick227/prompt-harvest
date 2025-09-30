/**
 * Queue Controller Factory
 *
 * Utility functions for creating queue controllers with consistent interfaces
 */

/**
 * Create a queue controller for consistent caller cancellation
 *
 * This helper function provides a consistent interface for creating queue tasks
 * with cancellation support. It automatically adds returnController: true to options.
 *
 * @param {QueueManager} queueManager - Queue manager instance
 * @param {Function} generationFunction - Task function to execute (signature: (signal) => Promise)
 * @param {Object} options - Task options (will have returnController: true added)
 * @returns {{promise: Promise, controller: AbortController|null}} Object containing:
 *   - promise: The task promise
 *   - controller: AbortController for cancellation (null if caller provided signal)
 *
 * @example
 * // Without external signal - returns controller
 * const {promise, controller} = createQueueController(queueManager, task, {});
 * controller.abort(); // Cancel the task
 *
 * @example
 * // With external signal - controller is null
 * const externalSignal = new AbortController().signal;
 * const {promise, controller} = createQueueController(queueManager, task, {abortSignal: externalSignal});
 * // controller is null, use externalSignal for cancellation
 *
 * @throws {ValidationError} If generationFunction is not a function
 * @throws {ShutdownError} If queue is not accepting new tasks
 * @throws {BackpressureError} If queue is at capacity
 * @throws {RateLimitError} If user rate limit exceeded
 */
export const createQueueController = async (queueManager, generationFunction, options = {}) => {
    const result = await queueManager.addToQueue(generationFunction, { ...options, returnController: true });

    // Normalize return shape - always return {promise, controller}
    if (typeof result === 'object' && result !== null && 'promise' in result) {
        return result;
    } else {
        // If no controller was returned, return promise with null controller
        return { promise: result, controller: null };
    }
};
