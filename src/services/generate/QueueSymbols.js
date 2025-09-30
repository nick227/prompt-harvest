/**
 * Queue Symbols
 *
 * Centralized symbols for queue system internal communication
 * This ensures all modules use the same symbol instances
 */

/**
 * Symbol for marking enqueue-time cancellation errors
 * Used to distinguish between different types of cancellation
 * and prevent double-counting metrics
 */
export const ENQUEUE_CANCEL = Symbol('enqueue-cancel');

/**
 * Symbol for marking task completion status
 * Used internally for task lifecycle tracking
 */
export const TASK_COMPLETE = Symbol('task-complete');

/**
 * Symbol for marking task failure status
 * Used internally for task lifecycle tracking
 */
export const TASK_FAILED = Symbol('task-failed');
